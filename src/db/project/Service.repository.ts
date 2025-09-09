import { Pool } from "pg";
import {
  Service,
  ServiceHierarchyItem,
  ServiceId,
  ServiceType,
} from "@open-source-economy/api-types";
import { pool } from "../../dbPool";
import { logger } from "../../config";
import { BaseRepository } from "../helpers";
import { ServiceCompanion } from "../helpers/companions";

export function getServiceRepository(): ServiceRepository {
  return new ServicesRepositoryImpl(pool);
}

export interface ServiceRepository {
  create(
    serviceType: ServiceType,
    name: string,
    description: string,
    isCustom: boolean,
    hasResponseTime: boolean,
  ): Promise<Service>;

  findAll(): Promise<Service[]>;

  findById(id: ServiceId): Promise<Service | null>;

  findByName(name: string): Promise<Service | null>;

  findByServiceType(serviceType: ServiceType): Promise<Service[]>;

  findCustomServices(): Promise<Service[]>;

  /**
   * Retrieves the hierarchy of services.
   *
   * @returns A promise that resolves to an array of ServiceHierarchyItem.
   */
  getHierarchy(): Promise<ServiceHierarchyItem[]>;

  delete(id: ServiceId): Promise<void>;
}

class ServicesRepositoryImpl
  extends BaseRepository<Service>
  implements ServiceRepository
{
  constructor(dbPool: Pool) {
    super(dbPool, ServiceCompanion);
  }

  async create(
    serviceType: ServiceType,
    name: string,
    description: string,
    isCustom: boolean,
    hasResponseTime: boolean,
  ): Promise<Service> {
    const query = `
      INSERT INTO services (
        service_type,
        name,
        description,
        is_custom,
        has_response_time
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [serviceType, name, description, isCustom, hasResponseTime];

    const result = await this.pool.query(query, values);
    return this.getOne(result.rows);
  }

  async findAll(): Promise<Service[]> {
    const query = `
      SELECT * FROM services
      ORDER BY name
    `;

    const result = await this.pool.query(query);
    return this.getList(result.rows);
  }

  async findById(id: ServiceId): Promise<Service | null> {
    logger.debug(`Getting service by id:`, id.uuid);
    const query = `SELECT * FROM services WHERE id = $1`;

    const result = await this.pool.query(query, [id.uuid]);
    return this.getOptional(result.rows);
  }

  async findByName(name: string): Promise<Service | null> {
    const query = `SELECT * FROM services WHERE name = $1`;

    const result = await this.pool.query(query, [name]);
    return this.getOptional(result.rows);
  }

  async findByServiceType(serviceType: ServiceType): Promise<Service[]> {
    const query = `
      SELECT * FROM services
      WHERE service_type = $1
      ORDER BY name
    `;
    const result = await this.pool.query(query, [serviceType]);
    return this.getList(result.rows);
  }

  async findCustomServices(): Promise<Service[]> {
    const query = `
      SELECT * FROM services
      WHERE is_custom = true
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query);
    return this.getList(result.rows);
  }

  async getHierarchy(): Promise<ServiceHierarchyItem[]> {
    const allServices = await this.findAll();

    const groupedServices = allServices.reduce(
      (acc, service) => {
        const category = service.serviceType;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(service);
        return acc;
      },
      {} as Record<ServiceType, Service[]>,
    );

    return Object.entries(groupedServices).map(([category, services]) => ({
      category: category as ServiceType,
      services,
    }));
  }

  async delete(id: ServiceId): Promise<void> {
    const query = `DELETE FROM services WHERE id = $1`;
    await this.pool.query(query, [id.uuid]);
  }
}
