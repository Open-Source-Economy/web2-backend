import passport from "passport";
import { Strategy } from "passport-github";
import {
  CreateUser,
  repositoryUserPermissionTokenRepo,
  userRepo,
} from "../db/";
import {
  ApiError,
  Provider,
  ThirdPartyUserId,
  UserRole,
  ValidationError,
} from "@open-source-economy/api-types";
import { config, logger } from "../config";
import { StatusCodes } from "http-status-codes";
import { ensureNoEndingTrailingSlash } from "../utils";
import { ThirdPartyUserCompanion } from "../db/helpers/companions/user";

const scope = ["user:email" /*, "read:org", "repo"*/]; // "user:email,read:org,repo",
passport.use(
  <passport.Strategy>new Strategy(
    {
      clientID: config.github.clientId,
      clientSecret: config.github.clientSecret,
      callbackURL: `${ensureNoEndingTrailingSlash(config.host)}/api/v1/auth/redirect/github`,
      scope: scope,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      logger.debug("GitHub profile received:", profile);
      try {
        const thirdPartyUserId = new ThirdPartyUserId(profile.id);
        const findUser = await userRepo.findByThirdPartyId(
          thirdPartyUserId,
          Provider.Github,
        );
        logger.debug("Result of findByThirdPartyId:", findUser);

        if (!findUser) {
          logger.debug("No existing user found. Creating new user.");
          const thirdPartyUser = ThirdPartyUserCompanion.fromJson(profile);
          logger.debug("ThirdPartyUser from JSON:", thirdPartyUser);

          let createUser: CreateUser;

          if (thirdPartyUser instanceof ValidationError) {
            return done(thirdPartyUser); // Properly handling the validation error
          }

          // const repositoryUserPermissionToken = req.repositoryUserPermissionToken; // TODO: does not work, repositoryUserPermissionToken is undefined...
          const repositoryUserPermissionToken =
            await repositoryUserPermissionTokenRepo.getByUserGithubOwnerLogin(
              thirdPartyUser.providerData.owner.id.login,
            );
          logger.debug(
            "Repository user permission token:",
            repositoryUserPermissionToken,
          );

          if (repositoryUserPermissionToken) {
            // if the user has received a repository user permission token (to get some rights about a repository)
            if (
              thirdPartyUser.providerData.owner.id.login !==
              repositoryUserPermissionToken.userGithubOwnerLogin
            ) {
              return done(
                new ApiError(
                  StatusCodes.UNAUTHORIZED,
                  "Wrong GitHub login. Please use the GitHub account that was invited to the repository.",
                ),
              );
            } else {
              thirdPartyUser.email = repositoryUserPermissionToken.userEmail;
              createUser = {
                name: repositoryUserPermissionToken.userName,
                data: thirdPartyUser,
                role: UserRole.USER,
                termsAcceptedVersion: null,
              };
            }
          } else {
            createUser = {
              name: null,
              data: thirdPartyUser,
              role: UserRole.USER,
              termsAcceptedVersion: null,
            };
          }

          const newSavedUser = await userRepo.insert(createUser);
          logger.debug("New user created and saved:", newSavedUser);

          return done(null, newSavedUser);
        }

        return done(null, findUser);
      } catch (err) {
        console.error("Error during GitHub authentication:", err);
        return done(err); // Handling any unexpected errors during authentication
      }
    },
  ),
);
