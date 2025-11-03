import { Pool } from "pg";
import {
  UserId,
  VerificationEntityType,
  VerificationRecord,
  VerificationStatus,
} from "@open-source-economy/api-types";
import { VerificationRecordCompanion } from "../helpers/companions/onboarding/VerificationRecord.companion";

export interface VerificationRecordRepository {
  /**
   * Create a new verification record
   */
  create(
    entityType: VerificationEntityType,
    entityId: string,
    status: VerificationStatus,
    notes: string | undefined,
    verifiedBy: UserId | undefined,
  ): Promise<VerificationRecord>;

  /**
   * Get the most recent verification record for an entity
   */
  findLatestByEntity(
    entityType: VerificationEntityType,
    entityId: string,
  ): Promise<VerificationRecord | null>;

  /**
   * Get all verification records for an entity (full history)
   */
  findAllByEntity(
    entityType: VerificationEntityType,
    entityId: string,
  ): Promise<VerificationRecord[]>;

  /**
   * Get all verification records for multiple entities at once
   * Useful for fetching verification status for a profile and all its projects
   */
  findAllByEntities(
    entities: Array<{ type: VerificationEntityType; id: string }>,
  ): Promise<VerificationRecord[]>;

  /**
   * Get the latest verification record for each entity
   * Returns a map of entityId -> VerificationRecord
   */
  findLatestByEntities(
    entities: Array<{ type: VerificationEntityType; id: string }>,
  ): Promise<Map<string, VerificationRecord>>;
}

export function createVerificationRecordRepository(
  pool: Pool,
): VerificationRecordRepository {
  return {
    async create(
      entityType: VerificationEntityType,
      entityId: string,
      status: VerificationStatus,
      notes: string | undefined,
      verifiedBy: UserId | undefined,
    ): Promise<VerificationRecord> {
      const query = `
        INSERT INTO verification_records (entity_type, entity_id, status, notes, verified_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const values = [
        entityType,
        entityId,
        status,
        notes || null,
        verifiedBy?.uuid || null,
      ];

      const result = await pool.query(query, values);
      const record = VerificationRecordCompanion.fromBackend(result.rows[0]);

      if (record instanceof Error) {
        throw record;
      }

      return record;
    },

    async findLatestByEntity(
      entityType: VerificationEntityType,
      entityId: string,
    ): Promise<VerificationRecord | null> {
      const query = `
        SELECT *
        FROM verification_records
        WHERE entity_type = $1 AND entity_id = $2
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const result = await pool.query(query, [entityType, entityId]);

      if (result.rows.length === 0) {
        return null;
      }

      const record = VerificationRecordCompanion.fromBackend(result.rows[0]);

      if (record instanceof Error) {
        throw record;
      }

      return record;
    },

    async findAllByEntity(
      entityType: VerificationEntityType,
      entityId: string,
    ): Promise<VerificationRecord[]> {
      const query = `
        SELECT *
        FROM verification_records
        WHERE entity_type = $1 AND entity_id = $2
        ORDER BY created_at DESC
      `;

      const result = await pool.query(query, [entityType, entityId]);

      const records: VerificationRecord[] = [];
      for (const row of result.rows) {
        const record = VerificationRecordCompanion.fromBackend(row);
        if (record instanceof Error) {
          throw record;
        }
        records.push(record);
      }

      return records;
    },

    async findAllByEntities(
      entities: Array<{ type: VerificationEntityType; id: string }>,
    ): Promise<VerificationRecord[]> {
      if (entities.length === 0) {
        return [];
      }

      // Build query with multiple entity conditions
      const conditions = entities
        .map(
          (_, index) =>
            `(entity_type = $${index * 2 + 1} AND entity_id = $${index * 2 + 2})`,
        )
        .join(" OR ");

      const query = `
        SELECT *
        FROM verification_records
        WHERE ${conditions}
        ORDER BY created_at DESC
      `;

      const values = entities.flatMap((e) => [e.type, e.id]);

      const result = await pool.query(query, values);

      const records: VerificationRecord[] = [];
      for (const row of result.rows) {
        const record = VerificationRecordCompanion.fromBackend(row);
        if (record instanceof Error) {
          throw record;
        }
        records.push(record);
      }

      return records;
    },

    async findLatestByEntities(
      entities: Array<{ type: VerificationEntityType; id: string }>,
    ): Promise<Map<string, VerificationRecord>> {
      if (entities.length === 0) {
        return new Map();
      }

      // Use DISTINCT ON to get only the latest record per entity
      const conditions = entities
        .map(
          (_, index) =>
            `(entity_type = $${index * 2 + 1} AND entity_id = $${index * 2 + 2})`,
        )
        .join(" OR ");

      const query = `
        SELECT DISTINCT ON (entity_id) *
        FROM verification_records
        WHERE ${conditions}
        ORDER BY entity_id, created_at DESC
      `;

      const values = entities.flatMap((e) => [e.type, e.id]);

      const result = await pool.query(query, values);

      const recordMap = new Map<string, VerificationRecord>();
      for (const row of result.rows) {
        const record = VerificationRecordCompanion.fromBackend(row);
        if (record instanceof Error) {
          throw record;
        }
        recordMap.set(row.entity_id, record);
      }

      return recordMap;
    },
  };
}
