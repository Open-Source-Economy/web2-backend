import { Pool } from "pg";
import { CompanyId, CompanyUserRole, UserId } from "@open-source-economy/api-types";
import { pool } from "../../dbPool";
import { logger } from "../../config";

export function getUserCompanyRepository(): UserCompanyRepository {
  return new UserCompanyRepositoryImpl(pool);
}

export interface UserCompanyRepository {
  insert(userId: UserId, companyId: CompanyId, role: CompanyUserRole): Promise<[UserId, CompanyId, CompanyUserRole]>;
  delete(userId: UserId, companyId: CompanyId): Promise<void>;
  getByUserId(userId: UserId): Promise<[CompanyId, CompanyUserRole][]>;
  getByCompanyId(companyId: CompanyId): Promise<[UserId, CompanyUserRole][]>;
}

class UserCompanyRepositoryImpl implements UserCompanyRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async insert(
    userId: UserId,
    companyId: CompanyId,
    role: CompanyUserRole
  ): Promise<[UserId, CompanyId, CompanyUserRole]> {
    const client = await this.pool.connect();
    logger.debug(`Inserting user ${userId} to company ${companyId} with role ${role}...`);

    try {
      const result = await client.query(
        `
                INSERT INTO user_company (user_id, company_id, role)
                VALUES ($1, $2, $3)
                RETURNING *
                `,
        [userId, companyId, role]
      );

      return [result.rows[0].user_id as UserId, result.rows[0].company_id as CompanyId, role];
    } catch (error) {
      throw error; // You might want to handle specific errors here
    } finally {
      client.release();
    }
  }

  async delete(userId: UserId, companyId: CompanyId): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query(
        `
                DELETE FROM user_company
                WHERE user_id = $1 AND company_id = $2
                `,
        [userId, companyId]
      );
    } catch (error) {
      throw error; // Handle errors as needed
    } finally {
      client.release();
    }
  }

  async getByUserId(userId: UserId): Promise<[CompanyId, CompanyUserRole][]> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
                SELECT *
                FROM user_company
                WHERE user_id = $1
                `,
        [userId]
      );

      return result.rows.map((row) => [row.company_id as CompanyId, row.role as CompanyUserRole]);
    } catch (error) {
      throw error; // Handle errors as needed
    } finally {
      client.release();
    }
  }

  async getByCompanyId(companyId: CompanyId): Promise<[UserId, CompanyUserRole][]> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
                SELECT *
                FROM user_company
                WHERE company_id = $1
                `,
        [companyId]
      );

      return result.rows.map((row) => [row.user_id as UserId, row.role as CompanyUserRole]);
    } catch (error) {
      throw error; // Handle errors as needed
    } finally {
      client.release();
    }
  }
}
