import { Pool } from "pg";
import {
  ApiError,
  DeveloperProfileId,
  DeveloperProjectItemId,
  DeveloperService,
  DeveloperServiceCompanion,
  DeveloperServiceId,
  ResponseTimeType,
  ServiceId,
} from "@open-source-economy/api-types";
import { pool } from "../../dbPool";
import { logger } from "../../config";
import { BaseRepository } from "../helpers";
import { StatusCodes } from "http-status-codes";

export function getDeveloperServiceRepository(): DeveloperServiceRepository {
  return new DeveloperServiceRepositoryImpl(pool);
}

/**
 * @param serviceId - The ID of the service.
 * @param body - An object containing the fields for the new developer service offering.
 */
export interface CreateDeveloperServiceParams {
  serviceId: ServiceId;
  body: DeveloperServiceBody;
}

/**
 * @param developerProjectItemIds - The new array of DeveloperProjectItemId to associate with this service. Existing links not in this array will be deleted, and new ones will be added.
 * @param hourlyRate - The updated hourly rate for the service (optional).
 * @param responseTimeHours - The updated response time type for the service (optional, can be null).
 * @param comment - An optional updated long text comment.
 */
export interface DeveloperServiceBody {
  developerProjectItemIds: DeveloperProjectItemId[];
  hourlyRate?: number;
  responseTimeHours?: ResponseTimeType | null;
  comment?: string;
}

export interface DeveloperServiceRepository {
  /**
   * Creates a new developer service offering and links it to multiple project items.
   * @param developerProfileId - The ID of the developer profile.
   * @param params - An object containing the service ID, and body with additional fields.
   * * @returns A promise that resolves to the newly created DeveloperService object (representing the offering with its links).
   */
  create(
    developerProfileId: DeveloperProfileId,
    params: CreateDeveloperServiceParams,
  ): Promise<DeveloperService>;

  /**
   * Updates an existing developer service offering, including its associated project items.
   *
   * @param id - The ID of the developer service offering to update.
   * @param body - An object containing the fields to update
   * @returns A promise that resolves to the updated DeveloperService object.
   */
  update(
    id: DeveloperServiceId,
    body: DeveloperServiceBody,
  ): Promise<DeveloperService>;

  /**
   * Deletes a developer service offering by its ID.
   * This will also cascade delete its links in the junction table.
   * @param id The ID of the developer service offering to delete.
   */
  delete(id: DeveloperServiceId): Promise<void>;

  /**
   * Retrieves all developer service offerings for a given developer profile ID.
   * @param profileId The ID of the developer profile.
   * @returns A promise that resolves to an array of DeveloperService objects.
   */
  getByProfileId(profileId: DeveloperProfileId): Promise<DeveloperService[]>;

  /**
   * Retrieves a developer service offering by its ID.
   * @param id The ID of the developer service offering.
   * @returns A promise that resolves to the DeveloperService or null if not found.
   */
  getById(id: DeveloperServiceId): Promise<DeveloperService | null>;

  /**
   * Retrieves a specific developer service offering by developer profile ID and service ID.
   * This is useful for checking if a developer already offers a particular service type.
   * @param developerProfileId The ID of the developer's profile.
   * @param serviceId The ID of the service definition.
   * @returns A Promise that resolves to the DeveloperService or null if not found.
   */
  getByProfileAndServiceId(
    developerProfileId: DeveloperProfileId,
    serviceId: ServiceId,
  ): Promise<DeveloperService | null>;
}

class DeveloperServiceRepositoryImpl
  extends BaseRepository<DeveloperService>
  implements DeveloperServiceRepository
{
  constructor(pool: Pool) {
    super(pool, DeveloperServiceCompanion);
  }

  /**
   * Helper function to retrieve all DeveloperProjectItemIds for a given service offering.
   * This is necessary because the links are stored in a separate junction table.
   */
  private async getProjectItemLinks(
    offeringId: DeveloperServiceId,
  ): Promise<DeveloperProjectItemId[]> {
    const result = await this.pool.query(
      `SELECT developer_project_item_id
         FROM developer_service_developer_project_item_link
         WHERE developer_service_id = $1`,
      [offeringId.uuid],
    );
    return result.rows.map(
      (row) => new DeveloperProjectItemId(row.developer_project_item_id),
    );
  }

  /**
   * Helper function to map a database row to a DeveloperService object,
   * including fetching the associated project item links.
   */
  private async mapRowToDeveloperService(row: any): Promise<DeveloperService> {
    const baseOffering = DeveloperServiceCompanion.fromBackend(row);
    if (baseOffering instanceof Error) {
      throw baseOffering;
    }
    const developerProjectItemIds = await this.getProjectItemLinks(
      baseOffering.id,
    );
    return { ...baseOffering, developerProjectItemIds };
  }

  /**
   * Private helper to safely insert project item links using parameterized queries,
   * which prevents SQL injection.
   * @param client The database client in the active transaction.
   * @param developerServiceId The ID of the service to link.
   * @param projectItemIds The IDs of the project items to link.
   */
  private async insertProjectItemLinks(
    client: any,
    developerServiceId: DeveloperServiceId,
    projectItemIds: DeveloperProjectItemId[],
  ): Promise<void> {
    if (projectItemIds.length === 0) {
      return;
    }
    // Construct a single VALUES clause using a parameterized query.
    // This is the secure way to perform a bulk insert.
    const valuesClause = projectItemIds
      .map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2})`)
      .join(",");
    const values = projectItemIds.flatMap((piid) => [
      developerServiceId.uuid,
      piid.uuid,
    ]);
    await client.query(
      `INSERT INTO developer_service_developer_project_item_link (developer_service_id, developer_project_item_id) VALUES ${valuesClause}`,
      values,
    );
  }

  async create(
    developerProfileId: DeveloperProfileId,
    params: CreateDeveloperServiceParams,
  ): Promise<DeveloperService> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const offeringResult = await client.query(
        `
          INSERT INTO developer_service (
            developer_profile_id,
            service_id,
            hourly_rate,
            response_time_type,
            comment
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `,
        [
          developerProfileId.uuid,
          params.serviceId.uuid,
          params.body.hourlyRate ?? null,
          params.body.responseTimeHours ?? null,
          params.body.comment ?? null,
        ],
      );

      const newOfferingId = new DeveloperServiceId(offeringResult.rows[0].id);

      // Securely insert links using a parameterized query.
      await this.insertProjectItemLinks(
        client,
        newOfferingId,
        params.body.developerProjectItemIds,
      );

      await client.query("COMMIT");

      // Retrieve the newly created service to get the full object.
      const newlyCreatedService = await this.getById(newOfferingId);
      if (!newlyCreatedService) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          "Failed to retrieve newly created service.",
        );
      }
      return newlyCreatedService;
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error creating developer service:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async update(
    id: DeveloperServiceId,
    body: DeveloperServiceBody,
  ): Promise<DeveloperService> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const setParts: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Conditionally add fields to the update query.
      if (body.hourlyRate !== undefined) {
        setParts.push(`hourly_rate = $${paramIndex}`);
        values.push(body.hourlyRate);
        paramIndex++;
      }
      if (body.responseTimeHours !== undefined) {
        setParts.push(`response_time_type = $${paramIndex}`);
        values.push(body.responseTimeHours);
        paramIndex++;
      }
      if (body.comment !== undefined) {
        setParts.push(`comment = $${paramIndex}`);
        values.push(body.comment);
        paramIndex++;
      }

      setParts.push(`updated_at = now()`);

      // Add the ID to the end of the values array for the WHERE clause.
      values.push(id.uuid);

      // Only perform the UPDATE query if there are fields to update.
      if (setParts.length > 1) {
        await client.query(
          `UPDATE developer_service SET ${setParts.join(", ")} WHERE id = $${paramIndex}`,
          values,
        );
      }

      // Delete all existing links for this service offering.
      await client.query(
        `DELETE FROM developer_service_developer_project_item_link WHERE developer_service_id = $1`,
        [id.uuid],
      );

      // Re-insert the new set of links using the secure helper function.
      await this.insertProjectItemLinks(
        client,
        id,
        body.developerProjectItemIds,
      );

      await client.query("COMMIT");

      const updated = await this.getById(id);
      if (!updated) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          "Service not found after update.",
        );
      }
      return updated;
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error updating developer service:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(id: DeveloperServiceId): Promise<void> {
    try {
      await this.pool.query(`DELETE FROM developer_service WHERE id = $1`, [
        id.uuid,
      ]);
    } catch (error) {
      logger.error(
        `Error deleting developer service with ID ${id.uuid}:`,
        error,
      );
      throw error;
    }
  }

  async getByProfileId(
    profileId: DeveloperProfileId,
  ): Promise<DeveloperService[]> {
    logger.debug(
      `Getting developer service offerings by profile id:`,
      profileId.uuid,
    );
    const result = await this.pool.query(
      `
          SELECT *
          FROM developer_service
          WHERE developer_profile_id = $1
          ORDER BY created_at DESC
        `,
      [profileId.uuid],
    );

    return Promise.all(
      result.rows.map((row) => this.mapRowToDeveloperService(row)),
    );
  }

  async getById(id: DeveloperServiceId): Promise<DeveloperService | null> {
    logger.debug(`Getting developer service offering by id:`, id.uuid);
    const result = await this.pool.query(
      `
          SELECT *
          FROM developer_service
          WHERE id = $1
        `,
      [id.uuid],
    );

    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToDeveloperService(result.rows[0]);
  }

  async getByProfileAndServiceId(
    developerProfileId: DeveloperProfileId,
    serviceId: ServiceId,
  ): Promise<DeveloperService | null> {
    logger.debug(
      `Getting developer service offering by profile and service ID:`,
      developerProfileId.uuid,
      serviceId.uuid,
    );

    const query = `
      SELECT *
      FROM developer_service
      WHERE developer_profile_id = $1
        AND service_id = $2
    `;
    const result = await this.pool.query(query, [
      developerProfileId.uuid,
      serviceId.uuid,
    ]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToDeveloperService(result.rows[0]);
  }
}
