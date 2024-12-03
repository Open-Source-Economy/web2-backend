import * as dotenv from "dotenv";
import Joi from "joi";
import { NodeEnv } from "./NodeEnv";

dotenv.config();

const envVarsSchema = Joi.object({
  ENV: Joi.string()
    .valid(...Object.values(NodeEnv))
    .required(),
  HOST: Joi.string().required().description("The host url"),
  PORT: Joi.number().required(),
  FRONT_END_URL: Joi.string()
    .required()
    .description("The front end url. Required for CORS and redirecting"),

  JWT_SECRET: Joi.string().required().description("JWT secret key"),
  JWT_ACCESS_EXPIRATION_MINUTES: Joi.number()
    .default(30)
    .description("minutes after which access tokens expire"),
  JWT_REFRESH_EXPIRATION_DAYS: Joi.number()
    .default(30)
    .description("days after which refresh tokens expire"),

  DATABASE_URL: Joi.string().required().description("postgres database url"),
  PGUSER: Joi.string().required().description("postgres name"),
  PGHOST: Joi.string().required().description("postgres host"),
  PGPORT: Joi.number().required().description("postgres database port"),
  PGDATABASE: Joi.string().required().description("postgres database"),
  PGPASSWORD: Joi.string().required().description("postgres password"),
  PGPOOL_MAX_SIZE: Joi.number().description("postgres database pool max size"),
  PGPOOL_MIN_SIZE: Joi.number()
    .required()
    .description("postgres database pool min size"),
  PGPOOL_IDLE_TIMEOUT_MILLIS: Joi.number()
    .required()
    .description("postgres: close idle clients after x millis"),

  GITHUB_CLIENT_ID: Joi.string().required().description("github client id"),
  GITHUB_CLIENT_SECRET: Joi.string()
    .required()
    .description("github client secret"),
  GITHUB_TOKEN: Joi.string().required().description("github token"),

  STRIPE_SECRET_KEY: Joi.string().required().description("stripe secret key"),
  STRIPE_WEBHOOK_SECRET: Joi.string()
    .required()
    .description("stripe webhook secret"),

  POSTMARK_API_TOKEN: Joi.string().required().description("Postmark api token"),
  POSTMARK_SENDER_EMAIL: Joi.string()
    .required()
    .description("the from field in the emails sent by the app"),
}).unknown();

const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: "key" } })
  .validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

interface Jwt {
  secret: string;
  accessExpirationMinutes: number;
  refreshExpirationDays: number;
}

interface Postgres {
  connectionString: string;
  user: string;
  host: string;
  port: number;
  frontEndPort: number;
  database: string;
  password: string;
  pool: {
    maxSize: number;
    minSize: number;
    idleTimeoutMillis: number; // Close idle clients after...
  };
}

interface Github {
  clientId: string;
  clientSecret: string;
  requestToken: string;
}

interface Stripe {
  secretKey: string;
  webhookSecret: string;
}

interface Email {
  postmarkApiToken: string;
  from: string;
}

interface Config {
  env: NodeEnv;
  host: string;
  port: number;
  frontEndUrl: string;
  jwt: Jwt;
  postgres: Postgres;
  github: Github;
  stripe: Stripe;
  email: Email;
}

export const config: Config = {
  env: envVars.ENV as NodeEnv,
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
  } as Jwt,
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
  } as Postgres,

  github: {
    clientId: envVars.GITHUB_CLIENT_ID,
    clientSecret: envVars.GITHUB_CLIENT_SECRET,
    requestToken: envVars.GITHUB_TOKEN,
  } as Github,

  stripe: {
    secretKey: envVars.STRIPE_SECRET_KEY,
    webhookSecret: envVars.STRIPE_WEBHOOK_SECRET,
  } as Stripe,

  email: {
    postmarkApiToken: envVars.POSTMARK_API_TOKEN,
    from: envVars.POSTMARK_SENDER_EMAIL,
  } as Email,
};
