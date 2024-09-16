import express from "express";

import session from "express-session";
import passport from "passport";
import v1Routes from "./routes/v1";
var cors = require("cors");

import { errorHandler } from "./middlewares/errorHandler";
import "./strategies";
import { getPool } from "./dbPool";

export function createApp() {
  const app = express();
  const pgSession = require("connect-pg-simple")(session);

  // TODO: production
  const corsOptions = {
    origin: "http://localhost:3000",
    credentials: true, // access-control-allow-credentials:true
    optionSuccessStatus: 200,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE", // Add allowed methods
    allowedHeaders: "Content-Type, Authorization", // Add allowed headers if needed
  };
  app.use(cors(corsOptions));

  app.use(express.json());
  // Use JSON parser for all non-webhook routes.
  app.use((req, res, next) => {
    console.log(req.originalUrl);
    if (req.originalUrl === "/api/v1/shop/webhook") {
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

  app.use(passport.initialize());
  app.use(passport.session());

  app.use("/api/v1", v1Routes);

  app.use(errorHandler);

  return app;
}
