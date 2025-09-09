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

export interface DeveloperServiceRepository {
  /**
   * Creates a new developer service offering and links it to multiple project items.
   *
   * @param developerProfileId - The ID of the developer profile.
   * @param serviceId - The ID of the service.
   * @param developerProjectItemIds - An array of DeveloperProjectItemId to associate with the new service offering.
   * @param hourlyRate - The hourly rate for the service (optional).
   * @param responseTimeHours - The response time type for the service (optional).
   * @param comment - An optional long text comment for this service.
   * @returns A promise that resolves to the newly created DeveloperService object (representing the offering with its links).
   */
  create(
    developerProfileId: DeveloperProfileId,
    serviceId: ServiceId,
    developerProjectItemIds: DeveloperProjectItemId[],
    hourlyRate?: number,
    responseTimeHours?: ResponseTimeType,
    comment?: string,
  ): Promise<DeveloperService>;

  /**
   * Updates an existing developer service offering, including its associated project items.
   *
   * @param id - The ID of the developer service offering to update.
   * @param developerProjectItemIds - The new array of DeveloperProjectItemId to associate with this service. Existing links not in this array will be deleted, and new ones will be added.
   * @param hourlyRate - The updated hourly rate for the service (optional).
   * @param responseTimeHours - The updated response time type for the service (optional, can be null).
   * @param comment - An optional updated long text comment.
   * @returns A promise that resolves to the updated DeveloperService object.
   */
  update(
    id: DeveloperServiceId,
    developerProjectItemIds: DeveloperProjectItemId[],
    hourlyRate?: number,
    responseTimeHours?: ResponseTimeType | null,
    comment?: string,
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
      `SELECT developer_project_item_id FROM developer_service_developer_project_item_link WHERE developer_service_id = $1`,
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

  async create(
    developerProfileId: DeveloperProfileId,
    serviceId: ServiceId,
    developerProjectItemIds: DeveloperProjectItemId[],
    hourlyRate?: number,
    responseTimeHours?: ResponseTimeType,
    comment?: string,
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
          serviceId.uuid,
          hourlyRate !== undefined ? hourlyRate : null,
          responseTimeHours !== undefined ? responseTimeHours : null,
          comment !== undefined ? comment : null,
        ],
      );
      const newOfferingId = new DeveloperServiceId(offeringResult.rows[0].id);

      // Insert links into the junction table if project items were provided.
      if (developerProjectItemIds.length > 0) {
        // Construct a single VALUES clause for a bulk insert.
        const linkValues = developerProjectItemIds
          .map((piid) => `('${newOfferingId.uuid}', '${piid.uuid}')`)
          .join(",");
        await client.query(
          `INSERT INTO developer_service_developer_project_item_link (developer_service_id, developer_project_item_id) VALUES ${linkValues}`,
        );
      }

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
    developerProjectItemIds: DeveloperProjectItemId[],
    hourlyRate?: number,
    responseTimeHours?: ResponseTimeType | null,
    comment?: string,
  ): Promise<DeveloperService> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const setParts: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Conditionally add fields to the update query.
      if (hourlyRate !== undefined) {
        setParts.push(`hourly_rate = $${paramIndex}`);
        values.push(hourlyRate);
        paramIndex++;
      }
      if (responseTimeHours !== undefined) {
        setParts.push(`response_time_type = $${paramIndex}`);
        values.push(responseTimeHours);
        paramIndex++;
      }
      if (comment !== undefined) {
        setParts.push(`comment = $${paramIndex}`);
        values.push(comment);
        paramIndex++;
      }

      setParts.push(`updated_at = now()`);

      // Add the ID to the end of the values array for the WHERE clause.
      values.push(id.uuid);
      const whereClauseIndex = paramIndex;

      // Only perform the UPDATE query if there are fields to update.
      if (setParts.length > 1) {
        await client.query(
          `UPDATE developer_service SET ${setParts.join(", ")} WHERE id = $${whereClauseIndex}`,
          values,
        );
      }

      // Delete all existing links for this service offering.
      await client.query(
        `DELETE FROM developer_service_developer_project_item_link WHERE developer_service_id = $1`,
        [id.uuid],
      );

      // Re-insert the new set of links.
      if (developerProjectItemIds.length > 0) {
        const linkValues = developerProjectItemIds
          .map((piid) => `('${id.uuid}', '${piid.uuid}')`)
          .join(",");
        await client.query(
          `INSERT INTO developer_service_developer_project_item_link (developer_service_id, developer_project_item_id) VALUES ${linkValues}`,
        );
      }

      await client.query("COMMIT");

      const updatedService = await this.getById(id);
      if (!updatedService) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          "Service not found after update.",
        );
      }
      return updatedService;
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
    // The SELECT query is updated to only fetch the columns needed by fromBackend
    const result = await this.pool.query(
      `
          SELECT *
          FROM developer_service
          WHERE developer_profile_id = $1
          ORDER BY created_at DESC
        `,
      [profileId.uuid],
    );

    const services = await Promise.all(
      result.rows.map((row) => this.mapRowToDeveloperService(row)),
    );
    return services;
  }

  async getById(id: DeveloperServiceId): Promise<DeveloperService | null> {
    logger.debug(`Getting developer service offering by id:`, id.uuid);
    // The SELECT query is updated to only fetch the columns needed by fromBackend
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
