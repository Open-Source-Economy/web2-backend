import { Pool } from "pg";
import { StripeCustomerId, StripeCustomerUser, UserId } from "../../model";
import { getPool } from "../../dbPool";

export function getStripeCustomerUserRepository(): StripeCustomerUserRepository {
  return new StripeCustomerUserRepositoryImpl(getPool());
}

export interface StripeCustomerUserRepository {
  insert(customer: StripeCustomerUser): Promise<StripeCustomerUser>;
  getByStripeId(id: StripeCustomerId): Promise<StripeCustomerUser | null>;
  getByUserId(id: UserId): Promise<StripeCustomerUser | null>;
  getAll(): Promise<StripeCustomerUser[]>;
}

class StripeCustomerUserRepositoryImpl implements StripeCustomerUserRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getOneCustomer(rows: any[]): StripeCustomerUser {
    const customer = this.getOptionalCustomer(rows);
    if (customer === null) {
      throw new Error("Customer not found");
    } else {
      return customer;
    }
  }

  private getOptionalCustomer(rows: any[]): StripeCustomerUser | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple customers found");
    } else {
      const customer = StripeCustomerUser.fromBackend(rows[0]);
      if (customer instanceof Error) {
        throw customer;
      }
      return customer;
    }
  }

  private getCustomerList(rows: any[]): StripeCustomerUser[] {
    return rows.map((r) => {
      const customer = StripeCustomerUser.fromBackend(r);
      if (customer instanceof Error) {
        throw customer;
      }
      return customer;
    });
  }

  async getAll(): Promise<StripeCustomerUser[]> {
    const result = await this.pool.query(`
      SELECT *
      FROM stripe_customer_user
    `);

    return this.getCustomerList(result.rows);
  }

  async getByStripeId(
    id: StripeCustomerId,
  ): Promise<StripeCustomerUser | null> {
    const result = await this.pool.query(
      `
        SELECT *
        FROM stripe_customer_user
        WHERE stripe_customer_id = $1
      `,
      [id.toString()],
    );

    return this.getOptionalCustomer(result.rows);
  }

  async getByUserId(id: UserId): Promise<StripeCustomerUser | null> {
    const result = await this.pool.query(
      `
        SELECT *
        FROM stripe_customer_user
        WHERE user_id = $1
      `,
      [id.toString()],
    );

    return this.getOptionalCustomer(result.rows);
  }

  async insert(customer: StripeCustomerUser): Promise<StripeCustomerUser> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `
          INSERT INTO stripe_customer_user (stripe_customer_id, user_id, company_id)
          VALUES ($1, $2, $3)
          RETURNING *
        `,
        [
          customer.stripeCustomerId.toString(),
          customer.userId.toString(),
          customer.companyId?.toString() ?? null,
        ],
      );

      await client.query("COMMIT");

      return this.getOneCustomer(result.rows);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
