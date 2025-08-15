import { Pool } from "pg";
import {
  DeveloperRights,
  DeveloperRoleType,
  MergeRightsType,
} from "../../api/model/onboarding/DeveloperRights";

export class DeveloperRightsRepository {
  private dbPool: Pool;

  constructor(dbPool: Pool) {
    this.dbPool = dbPool;
  }

  async create(
    developerProfileId: string,
    projectItemId: string,
    mergeRights: MergeRightsType[],
    roles: DeveloperRoleType[],
  ): Promise<DeveloperRights> {
    const query = `
      INSERT INTO developer_rights (
        developer_profile_id,
        project_item_id,
        merge_rights,
        roles
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [developerProfileId, projectItemId, mergeRights, roles];

    const result = await this.dbPool.query(query, values);
    return this.mapToDeveloperRights(result.rows[0]);
  }

  async update(
    id: string,
    mergeRights: MergeRightsType[],
    roles: DeveloperRoleType[],
  ): Promise<DeveloperRights> {
    const query = `
      UPDATE developer_rights
      SET 
        merge_rights = $2,
        roles = $3,
        updated_at = now()
      WHERE id = $1
      RETURNING *
    `;

    const values = [id, mergeRights, roles];

    const result = await this.dbPool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error(`DeveloperRights not found with id ${id}`);
    }
    return this.mapToDeveloperRights(result.rows[0]);
  }

  async findByProfileId(
    developerProfileId: string,
  ): Promise<DeveloperRights[]> {
    const query = `
      SELECT * FROM developer_rights
      WHERE developer_profile_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.dbPool.query(query, [developerProfileId]);
    return result.rows.map((row) => this.mapToDeveloperRights(row));
  }

  async findByProjectItemId(projectItemId: string): Promise<DeveloperRights[]> {
    const query = `
      SELECT * FROM developer_rights
      WHERE project_item_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.dbPool.query(query, [projectItemId]);
    return result.rows.map((row) => this.mapToDeveloperRights(row));
  }

  async findByProfileAndProjectItem(
    developerProfileId: string,
    projectItemId: string,
  ): Promise<DeveloperRights | null> {
    const query = `
      SELECT * FROM developer_rights
      WHERE developer_profile_id = $1 AND project_item_id = $2
    `;

    const result = await this.dbPool.query(query, [
      developerProfileId,
      projectItemId,
    ]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapToDeveloperRights(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    const query = `DELETE FROM developer_rights WHERE id = $1`;
    await this.dbPool.query(query, [id]);
  }

  async deleteByProjectItemId(projectItemId: string): Promise<void> {
    const query = `DELETE FROM developer_rights WHERE project_item_id = $1`;
    await this.dbPool.query(query, [projectItemId]);
  }

  private mapToDeveloperRights(row: any): DeveloperRights {
    return new DeveloperRights({
      id: row.id,
      developerProfileId: row.developer_profile_id,
      projectItemId: row.project_item_id,
      mergeRights: row.merge_rights,
      roles: row.roles,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
