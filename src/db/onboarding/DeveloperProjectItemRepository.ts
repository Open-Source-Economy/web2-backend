import { Pool } from "pg";
import {
  DeveloperProfileId,
  DeveloperProjectItem,
  DeveloperProjectItemId,
  DeveloperRoleType,
  MergeRightsType,
  ProjectItemId,
} from "@open-source-economy/api-types";
import { BaseRepository } from "../helpers";
import { pool } from "../../dbPool";
import { DeveloperProjectItemCompanion } from "../helpers/companions";

export function getDeveloperProjectItemRepository(): DeveloperProjectItemRepository {
  return new DeveloperProjectItemRepositoryImpl(pool);
}

export interface DeveloperProjectItemRepository {
  /**
   * Creates a new association between a developer profile and a project item.
   */
  create(
    developerProfileId: DeveloperProfileId,
    projectItemId: ProjectItemId,
    mergeRights: MergeRightsType[],
    roles: DeveloperRoleType[],
    comment?: string,
  ): Promise<DeveloperProjectItem>;

  /**
   * Updates an existing developer-project item association.
   */
  update(
    id: DeveloperProjectItemId,
    mergeRights: MergeRightsType[],
    roles: DeveloperRoleType[],
    comment?: string,
  ): Promise<DeveloperProjectItem>;

  /**
   * Finds all DeveloperProjectItems associated with a specific developer profile.
   */
  findByProfileId(
    developerProfileId: DeveloperProfileId,
  ): Promise<DeveloperProjectItem[]>;

  /**
   * Finds all DeveloperProjectItems associated with a specific project item.
   */
  findByProjectItemId(
    projectItemId: ProjectItemId,
  ): Promise<DeveloperProjectItem[]>;

  /**
   * Finds a specific DeveloperProjectItem by developer profile ID and project item ID.
   */
  findByProfileAndProjectItem(
    developerProfileId: DeveloperProfileId,
    projectItemId: ProjectItemId,
  ): Promise<DeveloperProjectItem | null>;

  /**
   * Deletes a DeveloperProjectItem by its ID.
   */
  delete(id: DeveloperProjectItemId): Promise<void>;

  /**
   * Deletes all DeveloperProjectItems associated with a specific project item.
   */
  deleteByProjectItemId(projectItemId: ProjectItemId): Promise<void>;

  /**
   * Deletes a DeveloperProjectItem by its developer profile ID and project item ID.
   */
  deleteByProfileAndProjectItemId(
    developerProfileId: DeveloperProfileId,
    projectItemId: ProjectItemId,
  ): Promise<void>;
}

class DeveloperProjectItemRepositoryImpl
  extends BaseRepository<DeveloperProjectItem>
  implements DeveloperProjectItemRepository
{
  constructor(dbPool: Pool) {
    super(dbPool, DeveloperProjectItemCompanion);
  }

  /**
   * Keep a single source of truth for selects, and cast enum[] -> text[] so pg returns JS arrays.
   */
  private static readonly SELECT_COLUMNS = `
    id,
    developer_profile_id,
    project_item_id,
    merge_rights::text[] AS merge_rights,
    roles::text[]        AS roles,
    comment,
    created_at,
    updated_at
  `;

  async create(
    developerProfileId: DeveloperProfileId,
    projectItemId: ProjectItemId,
    mergeRights: MergeRightsType[],
    roles: DeveloperRoleType[],
    comment?: string,
  ): Promise<DeveloperProjectItem> {
    const query = `
      INSERT INTO developer_project_items (
        developer_profile_id,
        project_item_id,
        merge_rights,
        roles,
        comment
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING ${DeveloperProjectItemRepositoryImpl.SELECT_COLUMNS}
    `;

    const values = [
      developerProfileId.uuid,
      projectItemId.uuid,
      mergeRights,
      roles,
      comment ?? null,
    ];

    const result = await this.pool.query(query, values);
    return this.getOne(result.rows);
  }

  async update(
    id: DeveloperProjectItemId,
    mergeRights: MergeRightsType[],
    roles: DeveloperRoleType[],
    comment?: string,
  ): Promise<DeveloperProjectItem> {
    const query = `
      UPDATE developer_project_items
      SET
        merge_rights = $2,
        roles        = $3,
        comment      = $4,
        updated_at   = now()
      WHERE id = $1
      RETURNING ${DeveloperProjectItemRepositoryImpl.SELECT_COLUMNS}
    `;

    const values = [id.uuid, mergeRights, roles, comment ?? null];

    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error(`DeveloperProjectItem not found with id ${id.uuid}`);
    }
    return this.getOne(result.rows);
  }

  async findByProfileId(
    developerProfileId: DeveloperProfileId,
  ): Promise<DeveloperProjectItem[]> {
    const query = `
      SELECT ${DeveloperProjectItemRepositoryImpl.SELECT_COLUMNS}
      FROM developer_project_items
      WHERE developer_profile_id = $1
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [developerProfileId.uuid]);
    return this.getList(result.rows);
  }

  async findByProjectItemId(
    projectItemId: ProjectItemId,
  ): Promise<DeveloperProjectItem[]> {
    const query = `
      SELECT ${DeveloperProjectItemRepositoryImpl.SELECT_COLUMNS}
      FROM developer_project_items
      WHERE project_item_id = $1
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [projectItemId.uuid]);
    return this.getList(result.rows);
  }

  async findByProfileAndProjectItem(
    developerProfileId: DeveloperProfileId,
    projectItemId: ProjectItemId,
  ): Promise<DeveloperProjectItem | null> {
    const query = `
      SELECT ${DeveloperProjectItemRepositoryImpl.SELECT_COLUMNS}
      FROM developer_project_items
      WHERE developer_profile_id = $1 AND project_item_id = $2
    `;
    const result = await this.pool.query(query, [
      developerProfileId.uuid,
      projectItemId.uuid,
    ]);
    return this.getOptional(result.rows);
  }

  async delete(id: DeveloperProjectItemId): Promise<void> {
    const query = `DELETE FROM developer_project_items WHERE id = $1`;
    await this.pool.query(query, [id.uuid]);
  }

  async deleteByProjectItemId(projectItemId: ProjectItemId): Promise<void> {
    const query = `DELETE FROM developer_project_items WHERE project_item_id = $1`;
    await this.pool.query(query, [projectItemId.uuid]);
  }

  async deleteByProfileAndProjectItemId(
    developerProfileId: DeveloperProfileId,
    projectItemId: ProjectItemId,
  ): Promise<void> {
    const query = `
    DELETE FROM developer_project_items
    WHERE developer_profile_id = $1 AND project_item_id = $2
  `;
    const result = await this.pool.query(query, [
      developerProfileId.uuid,
      projectItemId.uuid,
    ]);

    if (result.rowCount === 0) {
      throw new Error(
        `DeveloperProjectItem not found for developerProfileId=${developerProfileId.uuid} and projectItemId=${projectItemId.uuid}`,
      );
    }
  }
}
