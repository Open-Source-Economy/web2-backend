import { Pool } from "pg";
import { DeveloperService, DeveloperServiceId } from "../../api/model/onboarding";
import { AddServiceDto, UpdateServiceDto } from "../../api/dto";
import { pool } from "../../dbPool";
import { logger } from "../../config";

export function getDeveloperServiceRepository(): DeveloperServiceRepository {
  return new DeveloperServiceRepositoryImpl(pool);
}

export interface DeveloperServiceRepository {
  create(service: AddServiceDto, profileId: string): Promise<DeveloperService>;
  update(serviceId: string, updates: UpdateServiceDto): Promise<DeveloperService>;
  delete(serviceId: string): Promise<void>;
  getByProfileId(profileId: string): Promise<DeveloperService[]>;
  getById(serviceId: string): Promise<DeveloperService | null>;
  addServiceProjects(serviceId: string, projectIds: string[]): Promise<void>;
  removeServiceProjects(serviceId: string): Promise<void>;
  getServiceProjects(serviceId: string): Promise<string[]>;
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

  async create(service: AddServiceDto, profileId: string): Promise<DeveloperService> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const serviceResult = await client.query(
        `
        INSERT INTO developer_service (
          developer_profile_id, service_category_id, service_name, 
          hourly_rate, currency, response_time_hours
        )
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *
        `,
        [
          profileId,
          service.serviceCategoryId,
          service.serviceName || null,
          service.hourlyRate,
          service.currency,
          service.responseTimeHours || null,
        ],
      );

      const createdService = this.getOneDeveloperService(serviceResult.rows);

      if (service.projectIds.length > 0) {
        const projectValues = service.projectIds.map((projectId, index) => 
          `($1, $${index + 2})`
        ).join(', ');

        await client.query(
          `
          INSERT INTO service_project (developer_service_id, developer_project_id)
          VALUES ${projectValues}
          `,
          [createdService.id.uuid, ...service.projectIds],
        );
      }

      await client.query('COMMIT');
      return createdService;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async update(serviceId: string, updates: UpdateServiceDto): Promise<DeveloperService> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const setParts: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.serviceName !== undefined) {
        setParts.push(`service_name = $${paramIndex}`);
        values.push(updates.serviceName);
        paramIndex++;
      }

      if (updates.hourlyRate !== undefined) {
        setParts.push(`hourly_rate = $${paramIndex}`);
        values.push(updates.hourlyRate);
        paramIndex++;
      }

      if (updates.currency !== undefined) {
        setParts.push(`currency = $${paramIndex}`);
        values.push(updates.currency);
        paramIndex++;
      }

      if (updates.responseTimeHours !== undefined) {
        setParts.push(`response_time_hours = $${paramIndex}`);
        values.push(updates.responseTimeHours);
        paramIndex++;
      }

      setParts.push(`updated_at = $${paramIndex}`);
      values.push(new Date());
      paramIndex++;

      values.push(serviceId);

      const serviceResult = await client.query(
        `
        UPDATE developer_service
        SET ${setParts.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
        `,
        values,
      );

      const updatedService = this.getOneDeveloperService(serviceResult.rows);

      if (updates.projectIds !== undefined) {
        await client.query(
          `DELETE FROM service_project WHERE developer_service_id = $1`,
          [serviceId],
        );

        if (updates.projectIds.length > 0) {
          const projectValues = updates.projectIds.map((projectId, index) => 
            `($1, $${index + 2})`
          ).join(', ');

          await client.query(
            `
            INSERT INTO service_project (developer_service_id, developer_project_id)
            VALUES ${projectValues}
            `,
            [serviceId, ...updates.projectIds],
          );
        }
      }

      await client.query('COMMIT');
      return updatedService;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(serviceId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        `DELETE FROM service_project WHERE developer_service_id = $1`,
        [serviceId],
      );

      await client.query(
        `DELETE FROM developer_service WHERE id = $1`,
        [serviceId],
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getByProfileId(profileId: string): Promise<DeveloperService[]> {
    logger.debug(`Getting developer services by profile id:`, profileId);
    const result = await this.pool.query(
      `
      SELECT *
      FROM developer_service
      WHERE developer_profile_id = $1
      ORDER BY created_at DESC
      `,
      [profileId],
    );

    return this.getDeveloperServiceList(result.rows);
  }

  async getById(serviceId: string): Promise<DeveloperService | null> {
    logger.debug(`Getting developer service by id:`, serviceId);
    const result = await this.pool.query(
      `
      SELECT *
      FROM developer_service
      WHERE id = $1
      `,
      [serviceId],
    );

    return this.getOptionalDeveloperService(result.rows);
  }

  async addServiceProjects(serviceId: string, projectIds: string[]): Promise<void> {
    if (projectIds.length === 0) return;

    const client = await this.pool.connect();

    try {
      const projectValues = projectIds.map((projectId, index) => 
        `($1, $${index + 2})`
      ).join(', ');

      await client.query(
        `
        INSERT INTO service_project (developer_service_id, developer_project_id)
        VALUES ${projectValues}
        ON CONFLICT (developer_service_id, developer_project_id) DO NOTHING
        `,
        [serviceId, ...projectIds],
      );
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  async removeServiceProjects(serviceId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query(
        `DELETE FROM service_project WHERE developer_service_id = $1`,
        [serviceId],
      );
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  async getServiceProjects(serviceId: string): Promise<string[]> {
    logger.debug(`Getting service projects for service id:`, serviceId);
    const result = await this.pool.query(
      `
      SELECT developer_project_id
      FROM service_project
      WHERE developer_service_id = $1
      `,
      [serviceId],
    );

    return result.rows.map(row => row.developer_project_id);
  }
}