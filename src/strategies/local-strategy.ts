import passport from "passport";
import { Strategy } from "passport-local";

import { encrypt } from "../utils";
import { CreateUser, getUserRepository, UserRepository } from "../db/";
import { LocalUser, User, UserRole } from "../api/model";

const repo: UserRepository = getUserRepository();

// TODO: do something more secure
const superAdminEmails = ["lauriane@open-source-economy.com"];

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
        } else if (!(user.data instanceof LocalUser)) {
          return done(null, false, {
            message: "Already registered with a third party",
          });
        } else if (!encrypt.comparePassword(password, user.data.password)) {
          return done(null, false, {
            message: "Incorrect username or password.",
          });
        } else {
          return done(null, user); // user object attaches to the request as req.user
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
          if (!(user.data instanceof LocalUser)) {
            return done(null, false, {
              message: "Already registered with a third party",
            });
          } else if (!encrypt.comparePassword(password, user.data.password)) {
            return done(null, false, {
              message: "Incorrect username or password.",
            });
          } else {
            return done(null, user); // user object attaches to the request as req.user
          }
        }

        const createUser: CreateUser = {
          name: req.body.name,
          data: new LocalUser(email, false, password),
          role: superAdminEmails.includes(email.trim())
            ? UserRole.SUPER_ADMIN
            : UserRole.USER,
        };
        const savedUser = await repo.insert(createUser);
        return done(null, savedUser);
      } catch (err) {
        return done(err);
      }
    },
  ),
);
