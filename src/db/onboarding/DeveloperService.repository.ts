import { Pool } from "pg";
import {
  DeveloperService,
  ProjectItemId,
  ServiceId,
} from "../../api/model/onboarding";
import { CurrencyType } from "../../api/model/onboarding/DeveloperSettings";
import { pool } from "../../dbPool";
import { logger } from "../../config";

export function getDeveloperServiceRepository(): DeveloperServiceRepository {
  return new DeveloperServiceRepositoryImpl(pool);
}

export interface DeveloperServiceRepository {
  create(
    developerProfileId: string,
    projectItemId: string,
    serviceId: string,
    hourlyRate: number,
    currency: CurrencyType,
    responseTimeHours?: number | null,
  ): Promise<DeveloperService>;

  update(
    id: string,
    hourlyRate: number,
    currency: CurrencyType,
    responseTimeHours?: number | null,
  ): Promise<DeveloperService>;

  delete(id: string): Promise<void>;
  deleteByProjectItemId(projectItemId: string): Promise<void>;

  getByProfileId(profileId: string): Promise<DeveloperService[]>;
  getByProjectItemId(projectItemId: string): Promise<DeveloperService[]>;
  getById(id: string): Promise<DeveloperService | null>;

  getByProfileAndProjectItem(
    profileId: string,
    projectItemId: string,
  ): Promise<DeveloperService[]>;
}

class DeveloperServiceRepositoryImpl implements DeveloperServiceRepository {
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getOneDeveloperService(rows: any[]): DeveloperService {
    const service = this.getOptionalDeveloperService(rows);
    if (service === null) {
      throw new Error("Developer service not found");
    }
    return service;
  }

  private getOptionalDeveloperService(rows: any[]): DeveloperService | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple developer services found");
    } else {
      const service = DeveloperService.fromBackend(rows[0]);
      if (service instanceof Error) {
        throw service;
      }
      return service;
    }
  }

  private getDeveloperServiceList(rows: any[]): DeveloperService[] {
    return rows.map((r) => {
      const service = DeveloperService.fromBackend(r);
      if (service instanceof Error) {
        throw service;
      }
      return service;
    });
  }

  async create(
    developerProfileId: string,
    projectItemId: string,
    serviceId: string,
    hourlyRate: number,
    currency: CurrencyType,
    responseTimeHours?: number | null,
  ): Promise<DeveloperService> {
    const result = await this.pool.query(
      `
      INSERT INTO developer_service (
        developer_profile_id, 
        project_item_id,
        service_id,
        hourly_rate, 
        currency, 
        response_time_hours
      )
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *
      `,
      [
        developerProfileId,
        projectItemId,
        serviceId,
        hourlyRate,
        currency,
        responseTimeHours || null,
      ],
    );

    return this.getOneDeveloperService(result.rows);
  }

  async update(
    id: string,
    hourlyRate: number,
    currency: CurrencyType,
    responseTimeHours?: number | null,
  ): Promise<DeveloperService> {
    const result = await this.pool.query(
      `
      UPDATE developer_service
      SET 
        hourly_rate = $2,
        currency = $3,
        response_time_hours = $4,
        updated_at = now()
      WHERE id = $1
      RETURNING *
      `,
      [id, hourlyRate, currency, responseTimeHours || null],
    );

    return this.getOneDeveloperService(result.rows);
  }

  async delete(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM developer_service WHERE id = $1`, [id]);
  }

  async deleteByProjectItemId(projectItemId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM developer_service WHERE project_item_id = $1`,
      [projectItemId],
    );
  }

  async getByProfileId(profileId: string): Promise<DeveloperService[]> {
    logger.debug(`Getting developer services by profile id:`, profileId);
    const result = await this.pool.query(
      `
      SELECT ds.*, s.name as service_name, s.has_response_time
      FROM developer_service ds
      JOIN services s ON ds.service_id = s.id
      WHERE ds.developer_profile_id = $1
      ORDER BY ds.created_at DESC
      `,
      [profileId],
    );

    return this.getDeveloperServiceList(result.rows);
  }

  async getByProjectItemId(projectItemId: string): Promise<DeveloperService[]> {
    logger.debug(
      `Getting developer services by project item id:`,
      projectItemId,
    );
    const result = await this.pool.query(
      `
      SELECT ds.*, s.name as service_name, s.has_response_time
      FROM developer_service ds
      JOIN services s ON ds.service_id = s.id
      WHERE ds.project_item_id = $1
      ORDER BY ds.created_at DESC
      `,
      [projectItemId],
    );

    return this.getDeveloperServiceList(result.rows);
  }

  async getById(id: string): Promise<DeveloperService | null> {
    logger.debug(`Getting developer service by id:`, id);
    const result = await this.pool.query(
      `
      SELECT ds.*, s.name as service_name, s.has_response_time
      FROM developer_service ds
      JOIN services s ON ds.service_id = s.id
      WHERE ds.id = $1
      `,
      [id],
    );

    return this.getOptionalDeveloperService(result.rows);
  }

  async getByProfileAndProjectItem(
    profileId: string,
    projectItemId: string,
  ): Promise<DeveloperService[]> {
    logger.debug(`Getting developer services by profile and project item`);
    const result = await this.pool.query(
      `
      SELECT ds.*, s.name as service_name, s.has_response_time
      FROM developer_service ds
      JOIN services s ON ds.service_id = s.id
      WHERE ds.developer_profile_id = $1 AND ds.project_item_id = $2
      ORDER BY ds.created_at DESC
      `,
      [profileId, projectItemId],
    );

    return this.getDeveloperServiceList(result.rows);
  }
}
