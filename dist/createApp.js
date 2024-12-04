"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const passport_1 = __importDefault(require("passport"));
const v1_1 = __importDefault(require("./routes/v1"));
const errorHandler_1 = require("./middlewares/errorHandler");
require("./strategies");
const dbPool_1 = require("./dbPool");
const helmet_1 = __importDefault(require("helmet"));
const http_status_codes_1 = require("http-status-codes");
const morgan = __importStar(require("./config"));
const config_1 = require("./config");
const rateLimiter_1 = require("./middlewares/rateLimiter");
const ApiError_1 = require("./model/error/ApiError");
var cors = require("cors");
function createApp() {
    const app = (0, express_1.default)();
    const pgSession = require("connect-pg-simple")(express_session_1.default);
    const corsOptions = {
        origin: config_1.config.frontEndUrl,
        credentials: true, // access-control-allow-credentials:true
        optionSuccessStatus: 200,
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        allowedHeaders: "Content-Type, Authorization",
    };
    app.use(cors(corsOptions));
    if (config_1.config.env !== config_1.NodeEnv.Local) {
        app.use(morgan.successHandler);
        app.use(morgan.errorHandler);
    }
    // set security HTTP headers
    app.use((0, helmet_1.default)({
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
    }));
    app.use(helmet_1.default.hsts({ maxAge: 31536000 })); // 1 year
    app.use(express_1.default.json());
    // Use JSON parser for all non-webhook routes.
    app.use((req, res, next) => {
        if (req.originalUrl === "/api/v1/stripe/webhook") {
            // TODO refactor
            next();
        }
        else {
            express_1.default.json()(req, res, next);
        }
    });
    app.use((0, express_session_1.default)({
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
            pool: (0, dbPool_1.getPool)(),
            tableName: "user_session",
        }),
    }));
    // sanitize request data
    // TODO: lolo
    // app.use(xss());
    app.use(passport_1.default.initialize());
    app.use(passport_1.default.session());
    // limit repeated failed requests to auth endpoints
    if (config_1.config.env === config_1.NodeEnv.Production) {
        app.use("/api/v1/auth", rateLimiter_1.authLimiter);
    }
    app.use("/api/v1", v1_1.default);
    app.get("/", (req, res) => {
        res.send("Welcome to the server!");
    });
    // send back a 404 error for any unknown api request
    app.use((req, res, next) => {
        const errorMessage = `Not found: ${req.originalUrl}`;
        next(new ApiError_1.ApiError(http_status_codes_1.StatusCodes.NOT_FOUND, errorMessage));
    });
    // convert error to ApiError, if needed
    app.use(errorHandler_1.errorConverter);
    // handle error
    app.use(errorHandler_1.errorHandler);
    return app;
}
