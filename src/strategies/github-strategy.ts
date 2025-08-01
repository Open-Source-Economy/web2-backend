import passport from "passport";
import { Strategy } from "passport-github";
import {
  CreateUser,
  repositoryUserPermissionTokenRepo,
  userRepo,
} from "../db/";
import { getOwnerRepository } from "../db/github";
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
      scope: ["user:email", "read:org", "repo"], // Add permissions for onboarding functionality
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const ownerRepo = getOwnerRepository();
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

          // Store GitHub token for new user
          if (newSavedUser.data instanceof ThirdPartyUser) {
            const githubId = newSavedUser.data.providerData.owner.id.githubId;
            if (githubId !== undefined) {
              await ownerRepo.updateTokens(githubId, {
                accessToken,
                refreshToken: refreshToken || undefined,
                scope: "user:email,read:org,repo",
              });
            }
          }

          return done(null, newSavedUser);
        }

        // Update token for existing user
        if (findUser.data instanceof ThirdPartyUser) {
          const githubId = findUser.data.providerData.owner.id.githubId;
          if (githubId !== undefined) {
            await ownerRepo.updateTokens(githubId, {
              accessToken,
              refreshToken: refreshToken || undefined,
              scope: "user:email,read:org,repo",
            });
          }
        }

        return done(null, findUser);
      } catch (err) {
        return done(err); // Handling any unexpected errors during authentication
      }
    },
  ),
);
