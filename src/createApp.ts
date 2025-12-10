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
import { config, logger, NodeEnv } from "./config";
import { authLimiter } from "./middlewares/rateLimiter";
import { ApiError } from "@open-source-economy/api-types";
import path from "path";

var cors = require("cors");

export function createApp() {
  const app = express();

  // Trust only the first proxy (AWS ALB/API Gateway)
  app.set("trust proxy", 1);

  const pgSession = require("connect-pg-simple")(session);

  // Create session store with error handling
  // connect-pg-simple automatically prunes expired sessions in the background
  // Errors from pruning are handled by pool error handlers and unhandled rejection handler
  const sessionStore = new pgSession({
    pool: pool,
    tableName: "user_session",
    // Increase prune interval to reduce frequency of pruning operations
    // This reduces the chance of encountering connection errors
    pruneSessionInterval: 60 * 15, // Prune every 15 minutes instead of default 5 minutes
  });

  // Handle unhandled promise rejections from session pruning
  // connect-pg-simple uses async/await internally, so pruning errors become unhandled rejections
  process.on("unhandledRejection", (reason, promise) => {
    if (reason && typeof reason === "object" && "code" in reason) {
      const err = reason as { code?: string; message?: string };
      // Connection reset errors are common in serverless environments and can be safely ignored
      if (err.code === "ECONNRESET" || err.code === "EPIPE") {
        logger.warn(
          "Unhandled promise rejection from session pruning (connection reset):",
          err.message,
        );
        return; // Don't log as error, just warn
      }
    }
    // Log other unhandled rejections normally
    logger.error("Unhandled promise rejection:", reason);
  });

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
      saveUninitialized: false,
      resave: false,
      proxy: true,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        secure: config.env !== NodeEnv.Local,
        httpOnly: true,
        sameSite: config.env === NodeEnv.Production ? "lax" : "none", // TODO: lolo
      },
      store: sessionStore,
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
