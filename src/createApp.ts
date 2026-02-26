import express from "express";
import session from "express-session";
import passport from "passport";
import v1Routes from "./routes/v1";
import {
  errorConverter,
  errorHandler,
  problemDetailsErrorHandler,
  tsRestValidationErrorHandler,
  globalErrorHandler,
} from "./middlewares/errorHandler";
import "./strategies";
import { pool } from "./dbPool";
import helmet from "helmet";
import { StatusCodes } from "http-status-codes";
import * as morgan from "./config";
import { config, logger, NodeEnv } from "./config";
import { authLimiter } from "./middlewares/rateLimiter";
import { LegacyApiError } from "./middlewares/errorHandler";
import { createExpressEndpoints } from "@ts-rest/express";
import { contract } from "@open-source-economy/api-types";
import { githubRouter } from "./routes/ts-rest/github.router";
import { miscRouter } from "./routes/ts-rest/misc.router";
import { usersRouter } from "./routes/ts-rest/users.router";
import { projectsRouter } from "./routes/ts-rest/projects.router";
import { adminRouter } from "./routes/ts-rest/admin.router";
import { onboardingRouter } from "./routes/ts-rest/onboarding.router";
import { authRouter } from "./routes/ts-rest/auth.router";
import { stripeRouter } from "./routes/ts-rest/stripe.router";
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

  // ts-rest routes (registered before old Express routes, mounted at /api/v1)
  const tsRestApp = express.Router();
  createExpressEndpoints(contract.github, githubRouter, tsRestApp, {
    responseValidation: false,
  });
  createExpressEndpoints(contract.misc, miscRouter, tsRestApp, {
    responseValidation: false,
  });
  createExpressEndpoints(contract.users, usersRouter, tsRestApp, {
    responseValidation: false,
  });
  createExpressEndpoints(contract.projects, projectsRouter, tsRestApp, {
    responseValidation: false,
  });
  createExpressEndpoints(contract.admin, adminRouter, tsRestApp, {
    responseValidation: false,
  });
  createExpressEndpoints(contract.onboarding, onboardingRouter, tsRestApp, {
    responseValidation: false,
  });
  createExpressEndpoints(contract.stripe, stripeRouter, tsRestApp, {
    responseValidation: false,
  });
  // Auth: only non-Passport endpoints are handled by ts-rest.
  // Passport-dependent routes (register, login, github OAuth, logout) stay in Express.
  createExpressEndpoints(contract.auth, authRouter, tsRestApp, {
    responseValidation: false,
  });
  app.use("/api/v1", tsRestApp);

  // Existing Express routes: only auth (Passport-dependent), stripe webhook remain
  app.use("/api/v1", v1Routes);

  app.get("/", (req, res) => {
    res.send("Welcome to the server!");
  });

  // send back a 404 error for any unknown api request
  app.use((req, res, next) => {
    const errorMessage = `Not found: ${req.originalUrl}`;
    next(new LegacyApiError(StatusCodes.NOT_FOUND, errorMessage));
  });

  // Error handling: new ProblemDetails-based handlers first, then legacy
  app.use(problemDetailsErrorHandler);
  app.use(tsRestValidationErrorHandler);
  app.use(errorConverter); // legacy - removed in Phase 5
  app.use(errorHandler); // legacy - removed in Phase 5
  app.use(globalErrorHandler);

  return app;
}
