import { Pool } from "pg";
import { ServiceCategory, ServiceCategoryId } from "../../api/model/onboarding";
import { pool } from "../../dbPool";
import { logger } from "../../config";

export function getServiceCategoryRepository(): ServiceCategoryRepository {
  return new ServiceCategoryRepositoryImpl(pool);
}

export interface ServiceCategoryRepository {
  getAll(): Promise<ServiceCategory[]>;
  getById(id: string): Promise<ServiceCategory | null>;
}

class ServiceCategoryRepositoryImpl implements ServiceCategoryRepository {
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getOptionalServiceCategory(rows: any[]): ServiceCategory | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple service categories found");
    } else {
      const category = ServiceCategory.fromBackend(rows[0]);
      if (category instanceof Error) {
        throw category;
      }
      return category;
    }
  }

  private getServiceCategoryList(rows: any[]): ServiceCategory[] {
    return rows.map((r) => {
      const category = ServiceCategory.fromBackend(r);
      if (category instanceof Error) {
        throw category;
      }
      return category;
    });
  }

  async getAll(): Promise<ServiceCategory[]> {
    logger.debug(`Getting all service categories`);
    const result = await this.pool.query(
      `
      SELECT *
      FROM service_category
      ORDER BY name ASC
      `,
    );

    return this.getServiceCategoryList(result.rows);
  }

  async getById(id: string): Promise<ServiceCategory | null> {
    logger.debug(`Getting service category by id:`, id);
    const result = await this.pool.query(
      `
      SELECT *
      FROM service_category
      WHERE id = $1
      `,
      [id],
    );

    return this.getOptionalServiceCategory(result.rows);
  }
}
