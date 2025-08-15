import { Request, Response } from "express";
import { pool } from "../dbPool";
import { logger } from "../config";

interface HealthController {
  healthCheck(req: Request, res: Response): Promise<void>;
  detailedHealthCheck(req: Request, res: Response): Promise<void>;
}

export const HealthController: HealthController = {
  // Basic health check endpoint
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Quick database connectivity check
      await pool.query("SELECT 1");

      res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: "ose-backend",
      });
    } catch (error) {
      logger.error("Health check failed:", error);
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Database connection failed",
      });
    }
  },

  // Detailed health check with dependency status
  async detailedHealthCheck(req: Request, res: Response): Promise<void> {
    const healthCheck = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: "ose-backend",
      version: process.env.npm_package_version || "unknown",
      environment: process.env.NODE_ENV || "development",
      dependencies: {
        database: {} as any,
        github: {} as any,
      },
      system: {
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
        cpu: process.cpuUsage(),
      },
    };

    let overallStatus = "healthy";

    // Check database connectivity
    try {
      const dbStart = Date.now();
      const result = await pool.query(
        "SELECT NOW() as server_time, version() as version",
      );
      const dbLatency = Date.now() - dbStart;

      healthCheck.dependencies.database = {
        status: "up",
        latency: `${dbLatency}ms`,
        serverTime: result.rows[0].server_time,
        version: result.rows[0].version.split(" ")[0], // Just PostgreSQL version number
      };
    } catch (error) {
      logger.error("Database health check failed:", error);
      healthCheck.dependencies.database = {
        status: "down",
        error: "Connection failed",
      };
      overallStatus = "degraded";
    }

    // Check GitHub API connectivity (optional - don't fail if GitHub is down)
    try {
      // Simple test without authentication - just check if GitHub API responds
      const githubStart = Date.now();
      const response = await fetch("https://api.github.com/zen", {
        method: "GET",
      });
      const githubLatency = Date.now() - githubStart;

      if (response.ok) {
        healthCheck.dependencies.github = {
          status: "up",
          latency: `${githubLatency}ms`,
        };
      } else {
        healthCheck.dependencies.github = {
          status: "degraded",
          httpStatus: response.status,
        };
      }
    } catch (error) {
      logger.warn("GitHub API health check failed (non-critical):", error);
      healthCheck.dependencies.github = {
        status: "down",
        error: "API unreachable",
      };
      // Don't mark overall status as unhealthy for GitHub API issues
    }

    // Set overall status
    healthCheck.status = overallStatus;

    // Return appropriate HTTP status
    const httpStatus =
      overallStatus === "healthy"
        ? 200
        : overallStatus === "degraded"
          ? 200
          : 503;

    res.status(httpStatus).json(healthCheck);
  },
};
