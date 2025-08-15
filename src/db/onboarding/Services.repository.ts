import { Pool } from "pg";
import { Services } from "../../api/model/onboarding/Services";

export class ServicesRepository {
  private dbPool: Pool;

  constructor(dbPool: Pool) {
    this.dbPool = dbPool;
  }

  async create(
    name: string,
    parentId: string | null,
    isCustom: boolean,
    hasResponseTime: boolean
  ): Promise<Services> {
    const query = `
      INSERT INTO services (
        name,
        parent_id,
        is_custom,
        has_response_time
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [name, parentId, isCustom, hasResponseTime];

    const result = await this.dbPool.query(query, values);
    return this.mapToServices(result.rows[0]);
  }

  async findAll(): Promise<Services[]> {
    const query = `
      SELECT * FROM services
      ORDER BY parent_id NULLS FIRST, name
    `;

    const result = await this.dbPool.query(query);
    return result.rows.map(row => this.mapToServices(row));
  }

  async findById(id: string): Promise<Services | null> {
    const query = `SELECT * FROM services WHERE id = $1`;

    const result = await this.dbPool.query(query, [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapToServices(result.rows[0]);
  }

  async findByName(name: string): Promise<Services | null> {
    const query = `SELECT * FROM services WHERE name = $1`;

    const result = await this.dbPool.query(query, [name]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapToServices(result.rows[0]);
  }

  async findMainCategories(): Promise<Services[]> {
    const query = `
      SELECT * FROM services
      WHERE parent_id IS NULL
      ORDER BY name
    `;

    const result = await this.dbPool.query(query);
    return result.rows.map(row => this.mapToServices(row));
  }

  async findSubcategories(parentId: string): Promise<Services[]> {
    const query = `
      SELECT * FROM services
      WHERE parent_id = $1
      ORDER BY name
    `;

    const result = await this.dbPool.query(query, [parentId]);
    return result.rows.map(row => this.mapToServices(row));
  }

  async findCustomServices(): Promise<Services[]> {
    const query = `
      SELECT * FROM services
      WHERE is_custom = true
      ORDER BY created_at DESC
    `;

    const result = await this.dbPool.query(query);
    return result.rows.map(row => this.mapToServices(row));
  }

  async getHierarchy(): Promise<any[]> {
    const query = `
      WITH RECURSIVE service_tree AS (
        SELECT 
          s1.*,
          ARRAY[]::uuid[] as ancestors,
          0 as level
        FROM services s1
        WHERE s1.parent_id IS NULL
        
        UNION ALL
        
        SELECT 
          s2.*,
          ancestors || s2.parent_id,
          level + 1
        FROM services s2
        JOIN service_tree st ON s2.parent_id = st.id
      )
      SELECT * FROM service_tree
      ORDER BY level, name
    `;

    const result = await this.dbPool.query(query);
    return result.rows.map(row => ({
      ...this.mapToServices(row),
      level: row.level,
      ancestors: row.ancestors
    }));
  }

  async delete(id: string): Promise<void> {
    const query = `DELETE FROM services WHERE id = $1`;
    await this.dbPool.query(query, [id]);
  }

  private mapToServices(row: any): Services {
    return new Services({
      id: row.id,
      name: row.name,
      parentId: row.parent_id,
      isCustom: row.is_custom,
      hasResponseTime: row.has_response_time,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}