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
exports.config = void 0;
const dotenv = __importStar(require("dotenv"));
const joi_1 = __importDefault(require("joi"));
const NodeEnv_1 = require("./NodeEnv");
dotenv.config();
const envVarsSchema = joi_1.default.object({
    ENV: joi_1.default.string()
        .valid(...Object.values(NodeEnv_1.NodeEnv))
        .required(),
    HOST: joi_1.default.string().required().description("The host url"),
    PORT: joi_1.default.number().required(),
    FRONT_END_URL: joi_1.default.string()
        .required()
        .description("The front end url. Required for CORS and redirecting"),
    JWT_SECRET: joi_1.default.string().required().description("JWT secret key"),
    JWT_ACCESS_EXPIRATION_MINUTES: joi_1.default.number()
        .default(30)
        .description("minutes after which access tokens expire"),
    JWT_REFRESH_EXPIRATION_DAYS: joi_1.default.number()
        .default(30)
        .description("days after which refresh tokens expire"),
    DATABASE_URL: joi_1.default.string().required().description("postgres database url"),
    PGUSER: joi_1.default.string().required().description("postgres name"),
    PGHOST: joi_1.default.string().required().description("postgres host"),
    PGPORT: joi_1.default.number().required().description("postgres database port"),
    PGDATABASE: joi_1.default.string().required().description("postgres database"),
    PGPASSWORD: joi_1.default.string().required().description("postgres password"),
    PGPOOL_MAX_SIZE: joi_1.default.number().description("postgres database pool max size"),
    PGPOOL_MIN_SIZE: joi_1.default.number()
        .required()
        .description("postgres database pool min size"),
    PGPOOL_IDLE_TIMEOUT_MILLIS: joi_1.default.number()
        .required()
        .description("postgres: close idle clients after x millis"),
    GITHUB_CLIENT_ID: joi_1.default.string().required().description("github client id"),
    GITHUB_CLIENT_SECRET: joi_1.default.string()
        .required()
        .description("github client secret"),
    GITHUB_TOKEN: joi_1.default.string().required().description("github token"),
    STRIPE_SECRET_KEY: joi_1.default.string().required().description("stripe secret key"),
    STRIPE_WEBHOOK_SECRET: joi_1.default.string()
        .required()
        .description("stripe webhook secret"),
    POSTMARK_API_TOKEN: joi_1.default.string().required().description("Postmark api token"),
    POSTMARK_SENDER_EMAIL: joi_1.default.string()
        .required()
        .description("the from field in the emails sent by the app"),
}).unknown();
const { value: envVars, error } = envVarsSchema
    .prefs({ errors: { label: "key" } })
    .validate(process.env);
if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}
exports.config = {
    env: envVars.ENV,
    host: envVars.HOST,
    port: envVars.PORT,
    frontEndUrl: envVars.FRONT_END_URL,
    // pagination: {
    //     limit: 10,
    //     page: 1,
    // },
    jwt: {
        secret: envVars.JWT_SECRET,
        accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
        refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
        resetPasswordExpirationMinutes: 10,
    },
    // cookie: {
    //     cookieExpirationHours: envVars.COOKIE_EXPIRATION_HOURS,
    // },
    postgres: {
        connectionString: envVars.DATABASE_URL,
        user: envVars.PGUSER,
        host: envVars.PGHOST,
        port: envVars.PGPORT,
        database: envVars.PGDATABASE,
        password: envVars.PGPASSWORD,
        pool: {
            maxSize: envVars.PGPOOL_MAX_SIZE,
            minSize: envVars.PGPOOL_MIN_SIZE,
            idleTimeoutMillis: envVars.PGPOOL_IDLE_TIMEOUT_MILLIS,
        },
    },
    github: {
        clientId: envVars.GITHUB_CLIENT_ID,
        clientSecret: envVars.GITHUB_CLIENT_SECRET,
        requestToken: envVars.GITHUB_TOKEN,
    },
    stripe: {
        secretKey: envVars.STRIPE_SECRET_KEY,
        webhookSecret: envVars.STRIPE_WEBHOOK_SECRET,
    },
    email: {
        postmarkApiToken: envVars.POSTMARK_API_TOKEN,
        from: envVars.POSTMARK_SENDER_EMAIL,
    },
};
