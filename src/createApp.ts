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
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "default-src": ["'self'"], // Restrict everything to the same origin by default
          "script-src": ["'self'"], // Only allow scripts from the same origin
          "style-src": ["'self'", "'strict-dynamic'"], // Avoid inline styles, or use strict-dynamic if needed
          "img-src": ["'self'", "https:"], // Allow images from the same origin and HTTPS
          "object-src": ["'none'"], // Disallow objects (Flash, etc.)
          "connect-src": ["'self'"], // Restrict network connections
          "font-src": ["'self'", "https:"], // Allow fonts from the same origin and HTTPS
        },
      },
    }),
  );

  app.use(helmet.hsts({ maxAge: 31536000 })); // 1 year

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
      secret: "your-secret-key",
      saveUninitialized: true,
      resave: false,
      proxy: true,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: true,
        httpOnly: true, // Protect against XSS
        sameSite: "none",
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

  app.get("/", (req, res) => {
    res.send("Welcome to the server!");
  });

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
