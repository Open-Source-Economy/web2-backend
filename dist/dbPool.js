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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPool = getPool;
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
const config_1 = require("./config");
dotenv.config();
function getPool() {
    return new pg_1.Pool({
        connectionString: config_1.config.postgres.connectionString,
        ssl: {
            rejectUnauthorized: false,
        },
        // user: config.postgres.user,
        // password: config.postgres.password,
        // host: config.postgres.host,
        // port: config.postgres.port,
        // database: config.postgres.database,
        // max: config.postgres.pool.maxSize,
        // min: config.postgres.pool.minSize,
        // idleTimeoutMillis: config.postgres.pool.idleTimeoutMillis,
    });
}
