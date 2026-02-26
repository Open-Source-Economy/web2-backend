import passport from "passport";
import { Strategy } from "passport-local";

import { encrypt } from "../utils";
import { CreateUser, getUserRepository, UserRepository } from "../db/";
import { LocalUser, User, UserRole } from "@open-source-economy/api-types";
import { terms } from "../config";

const repo: UserRepository = getUserRepository();

// TODO: do something more secure
const superAdminEmails = ["lauriane@open-source-economy.com"];

/**
 * Helper to check if the backend's internal user representation is a local user.
 * The backend stores extra data on User objects beyond the api-types interface
 * (via the `data` property set by UserCompanion). This checks for local users
 * which have `hashed_password` in the raw DB representation.
 */
function isLocalUser(user: User): boolean {
  const data = (user as any).data;
  // A local user has an email and password fields, but not a provider field
  return data && !("provider" in data);
}

function getLocalUserPassword(user: User): string | undefined {
  const data = (user as any).data;
  return data?.password;
}

passport.use(
  "local-login",
  // email field in the request body and send that as argument for the username
  new Strategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (username, password, done) => {
      try {
        const user: User | null = await repo.findOne(username);
        if (!user) {
          return done(null, false, {
            message: "Incorrect username or password.",
          });
        } else if (!isLocalUser(user)) {
          return done(null, false, {
            message: "Already registered with a third party",
          });
        } else {
          const storedPassword = getLocalUserPassword(user);
          if (
            !storedPassword ||
            !encrypt.comparePassword(password, storedPassword)
          ) {
            return done(null, false, {
              message: "Incorrect username or password.",
            });
          } else {
            return done(null, user); // user object attaches to the request as req.user
          }
        }
      } catch (err) {
        return done(err);
      }
    },
  ),
);

passport.use(
  "local-register",
  new Strategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      try {
        const user: User | null = await repo.findOne(email);
        if (user) {
          if (!isLocalUser(user)) {
            return done(null, false, {
              message: "Already registered with a third party",
            });
          } else {
            const storedPassword = getLocalUserPassword(user);
            if (
              !storedPassword ||
              !encrypt.comparePassword(password, storedPassword)
            ) {
              return done(null, false, {
                message: "Incorrect username or password.",
              });
            } else {
              return done(null, user); // user object attaches to the request as req.user
            }
          }
        }

        // LocalUser is now an interface; create an object literal.
        // The backend's CreateUser.data includes password for hashing during insert.
        const localUserData: LocalUser & { password: string } = {
          email,
          isEmailVerified: false,
          password,
        };
        const createUser: CreateUser = {
          name: req.body.name,
          data: localUserData as any,
          role: superAdminEmails.includes(email.trim())
            ? UserRole.SUPER_ADMIN
            : UserRole.USER,
          termsAcceptedVersion: terms.version, // TODO: lolo - verify that it is correct
        };
        const savedUser = await repo.insert(createUser);
        return done(null, savedUser);
      } catch (err) {
        return done(err);
      }
    },
  ),
);
