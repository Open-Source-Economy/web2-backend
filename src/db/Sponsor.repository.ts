import { Pool } from "pg";
import {
  OwnerId,
  Sponsor,
  StripeCustomerId,
} from "@open-source-economy/api-types";
import { pool } from "../dbPool";
import { SponsorCompanion } from "./helpers/companions";

export function getSponsorRepository(): SponsorRepository {
  return new SponsorRepositoryImpl(pool);
}

export interface SponsorRepository {
  createOrUpdate(
    stripeCustomerId: StripeCustomerId,
    ownerId: OwnerId,
    isPublic?: boolean,
  ): Promise<Sponsor>;
  getByStripeCustomerId(
    stripeCustomerId: StripeCustomerId,
  ): Promise<Sponsor | null>;
  getAllPublic(): Promise<Sponsor[]>;
}

class SponsorRepositoryImpl implements SponsorRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async createOrUpdate(
    stripeCustomerId: StripeCustomerId,
    ownerId: OwnerId,
    isPublic: boolean = true,
  ): Promise<Sponsor> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // Get github_owner_id from github_owner_login if not provided
      let githubOwnerId = ownerId.githubId;
      if (!githubOwnerId) {
        const ownerResult = await client.query(
          `
            SELECT github_id FROM github_owner
            WHERE github_login = $1
          `,
          [ownerId.login],
        );

        if (ownerResult.rows.length === 0) {
          throw new Error(`GitHub owner with login ${ownerId.login} not found`);
        }

        githubOwnerId = ownerResult.rows[0].github_id;
      }

      const githubOwnerLogin = ownerId.login;

      // Check if sponsor already exists
      const existingResult = await client.query(
        `
          SELECT * FROM sponsor
          WHERE stripe_customer_id = $1
            AND github_owner_login = $2
        `,
        [stripeCustomerId.id, githubOwnerLogin],
      );

      if (existingResult.rows.length > 0) {
        // Update existing sponsor
        const result = await client.query(
          `
            UPDATE sponsor
            SET github_owner_id = $1,
                github_owner_login = $2,
                is_public = $3,
                updated_at = now()
            WHERE stripe_customer_id = $4
              AND github_owner_login = $5
            RETURNING *
          `,
          [
            githubOwnerId,
            githubOwnerLogin,
            isPublic,
            stripeCustomerId.id,
            githubOwnerLogin,
          ],
        );

        await client.query("COMMIT");

        const sponsor = SponsorCompanion.fromBackend(result.rows[0]);
        if (sponsor instanceof Error) {
          throw sponsor;
        }
        return sponsor;
      } else {
        // Create new sponsor
        const result = await client.query(
          `
            INSERT INTO sponsor (
              stripe_customer_id,
              github_owner_id,
              github_owner_login,
              is_public
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *
          `,
          [stripeCustomerId.id, githubOwnerId, githubOwnerLogin, isPublic],
        );

        await client.query("COMMIT");

        const sponsor = SponsorCompanion.fromBackend(result.rows[0]);
        if (sponsor instanceof Error) {
          throw sponsor;
        }
        return sponsor;
      }
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getByStripeCustomerId(
    stripeCustomerId: StripeCustomerId,
  ): Promise<Sponsor | null> {
    const result = await this.pool.query(
      `
        SELECT * FROM sponsor
        WHERE stripe_customer_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [stripeCustomerId.id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const sponsor = SponsorCompanion.fromBackend(result.rows[0]);
    if (sponsor instanceof Error) {
      throw sponsor;
    }
    return sponsor;
  }

  async getAllPublic(): Promise<Sponsor[]> {
    const result = await this.pool.query(
      `
        SELECT * FROM sponsor
        WHERE is_public = true
        ORDER BY created_at DESC
      `,
    );

    return result.rows.map((row) => {
      const sponsor = SponsorCompanion.fromBackend(row);
      if (sponsor instanceof Error) {
        throw sponsor;
      }
      return sponsor;
    });
  }
}
