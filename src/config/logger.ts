import winston from "winston";
import { NodeEnv } from "./NodeEnv";
import { config } from "./config";
import { TransformableInfo } from "logform";

const enumerateErrorFormat = winston.format((info) => {
  if (info instanceof Error && info.stack) {
    Object.assign(info, { message: info.stack });
  }
  return info;
});

// Add a winston format to filter debug messages
const filterDebug = winston.format((info) => {
  if (!config.showDebugLogs && info.level === "debug") {
    return false;
  } else {
    return info;
  }
});

// Add a format to stringify objects in messages
const formatWithObjects = winston.format((info) => {
  const splat = info[Symbol.for("splat")]; // Access the additional arguments
  if (splat && Array.isArray(splat)) {
    info.message +=
      " " +
      splat
        .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg))
        .join(" ");
  }
  return info;
});

/* The level configuration in Winston defines the minimum severity level of logs that will be processed and output. It works like a filter where only logs of the specified level and higher severity will be shown.
   The Winston log levels from lowest to highest severity are:
   "silly"
   "debug"
   "verbose"
   "info"
   "warn"
   "error"
 */
export const logger = winston.createLogger({
  level: config.showDebugLogs ? "debug" : "info",
  format: winston.format.combine(
    filterDebug(),
    enumerateErrorFormat(),
    formatWithObjects(),
    config.env === NodeEnv.Local
      ? winston.format.colorize()
      : winston.format.uncolorize(),
    winston.format.splat(),
    winston.format.printf(
      (info: TransformableInfo) => `${info.level}: ${info.message}`,
    ),
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ["error"],
      consoleWarnLevels: ["warn"],
      eol: "", // Removes extra newlines
      log: (info, callback) => {
        // Custom log function to bypass console.log prefix
        process.stdout.write(`${info[Symbol.for("message")]}\n`);
        callback();
      },
    }),
  ],
});
