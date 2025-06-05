import express from "express";
import session from "express-session";
import passport from "passport";
import v1Routes from "./routes/v1";
import { errorConverter, errorHandler } from "./middlewares/errorHandler";
import "./strategies";
import { pool } from "./dbPool";
import helmet from "helmet";
import { StatusCodes } from "http-status-codes";
import * as morgan from "./config";
import { config, NodeEnv } from "./config";
import { authLimiter } from "./middlewares/rateLimiter";
import { ApiError } from "./api/model/error/ApiError";
import path from "path";

var cors = require("cors");

export function createApp() {
  const app = express();

  // Trust only the first proxy (AWS ALB/API Gateway)
  app.set("trust proxy", 1);

  const pgSession = require("connect-pg-simple")(session);

  const corsOptions = {
    origin: config.frontEndUrl,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "stripe-signature"], // Added stripe-signature
    credentials: true,
    optionsSuccessStatus: 200,
  };

  app.use(cors(corsOptions));

  app.use("/public", express.static(path.join(__dirname, "../public")));
  app.get("/favicon.ico", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/favicon-64x64.ico"));
  });
  app.get("/favicon.png", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/favicon-64x64.png"));
  });

  app.get("/robots.txt", (req, res) => {
    res.type("text/plain");
    res.send(`
        User-agent: *
        Disallow: /api/
        Allow: /
        
        # This is an API server
        # For the main website, visit: ${config.frontEndUrl}`);
  });

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

  // IMPORTANT: Remove the global express.json() middleware

  // Use raw body parser for webhook route and JSON parser for other routes
  app.use((req, res, next) => {
    if (req.originalUrl === "/api/v1/stripe/webhook") {
      express.raw({ type: "application/json" })(req, res, next);
    } else {
      express.json()(req, res, next);
    }
  });

  app.use(
    session({
      secret: "your-secret-key", // TODO: lolo
      saveUninitialized: true,
      resave: false,
      proxy: true,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        // Only use secure cookies in production
        secure: config.env === NodeEnv.Production,
        httpOnly: true,
        sameSite: config.env === NodeEnv.Production ? "none" : "lax",
      },
      store: new pgSession({
        pool: pool,
        tableName: "user_session",
      }),
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

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

  app.use(errorConverter);
  app.use(errorHandler);

  return app;
}
