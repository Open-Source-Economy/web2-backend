import passport from "passport";
import { Strategy } from "passport-github";
import {
  CreateUser,
  repositoryUserPermissionTokenRepo,
  userRepo,
} from "../db/";
import {
  Provider,
  ThirdPartyUser,
  ThirdPartyUserId,
  UserRole,
} from "../api/model";
import { config } from "../config";
import { ValidationError } from "../api/model/error";
import { ApiError } from "../api/model/error/ApiError";
import { StatusCodes } from "http-status-codes";
import { ensureNoEndingTrailingSlash } from "../utils";

passport.use(
  <passport.Strategy>new Strategy(
    {
      clientID: config.github.clientId,
      clientSecret: config.github.clientSecret,
      callbackURL: `${ensureNoEndingTrailingSlash(config.host)}/api/v1/auth/redirect/github`,
      scope: ["user:email"], // Request additional GitHub user data like email
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const thirdPartyUserId = new ThirdPartyUserId(profile.id);
        const findUser = await userRepo.findByThirdPartyId(
          thirdPartyUserId,
          Provider.Github,
        );

        if (!findUser) {
          const thirdPartyUser = ThirdPartyUser.fromJson(profile);
          let createUser: CreateUser;

          if (thirdPartyUser instanceof ValidationError) {
            return done(thirdPartyUser); // Properly handling the validation error
          }

          // const repositoryUserPermissionToken = req.repositoryUserPermissionToken; // TODO: does not work, repositoryUserPermissionToken is undefined...
          const repositoryUserPermissionToken =
            await repositoryUserPermissionTokenRepo.getByUserGithubOwnerLogin(
              thirdPartyUser.providerData.owner.id.login,
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
              };
            }
          } else {
            createUser = {
              name: null,
              data: thirdPartyUser,
              role: UserRole.USER,
            };
          }

          const newSavedUser = await userRepo.insert(createUser);
          return done(null, newSavedUser);
        }

        return done(null, findUser);
      } catch (err) {
        return done(err); // Handling any unexpected errors during authentication
      }
    },
  ),
);
