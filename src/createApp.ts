import express from "express";
import session from "express-session";
import passport from "passport";
import v1Routes from "./routes/v1";
import { errorConverter, errorHandler } from "./middlewares/errorHandler";
import "./strategies";
import { getPool } from "./dbPool";
import helmet from "helmet";
import { StatusCodes } from "http-status-codes";
import * as morgan from "./config";
import { config, NodeEnv } from "./config";
import { authLimiter } from "./middlewares/rateLimiter";
import { ApiError } from "./model/error/ApiError";

var cors = require("cors");

export function createApp() {
  const app = express();
  const pgSession = require("connect-pg-simple")(session);

  const corsOptions = {
    origin: config.frontEndUrl,
    credentials: true, // access-control-allow-credentials:true
    optionSuccessStatus: 200,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Content-Type, Authorization",
  };

  app.use(cors(corsOptions));

  if (config.env !== NodeEnv.Local) {
    app.use(morgan.successHandler);
    app.use(morgan.errorHandler);
  }

  // set security HTTP headers
  app.use(helmet());

  app.use(express.json());
  // Use JSON parser for all non-webhook routes.
  app.use((req, res, next) => {
    if (req.originalUrl === "/api/v1/stripe/webhook") {
      // TODO refactor
      next();
    } else {
      express.json()(req, res, next);
    }
  });

  app.use(
    session({
      secret: "anson the dev", // TODO: process.env.FOO_COOKIE_SECRET
      saveUninitialized: true,
      resave: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
      store: new pgSession({
        pool: getPool(),
        tableName: "user_session",
      }),
    }),
  );

  // sanitize request data
  // TODO: lolo
  // app.use(xss());

  app.use(passport.initialize());
  app.use(passport.session());

  // limit repeated failed requests to auth endpoints
  if (config.env === NodeEnv.Production) {
    app.use("/api/v1/auth", authLimiter);
  }
  app.use("/api/v1", v1Routes);

  // send back a 404 error for any unknown api request
  app.use((req, res, next) => {
    const errorMessage = `Not found: ${req.originalUrl}`;
    next(new ApiError(StatusCodes.NOT_FOUND, errorMessage));
  });

  // convert error to ApiError, if needed
  app.use(errorConverter);

  // handle error
  app.use(errorHandler);

  return app;
}
