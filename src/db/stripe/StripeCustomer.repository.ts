import { Pool } from "pg";
import {
  StripeCustomer,
  StripeCustomerId,
} from "@open-source-economy/api-types";
import { pool } from "../../dbPool";

export function getStripeCustomerRepository(): StripeCustomerRepository {
  return new StripeCustomerRepositoryImpl(pool);
}

export interface StripeCustomerRepository {
  insert(customer: StripeCustomer): Promise<StripeCustomer>;

  getByStripeId(id: StripeCustomerId): Promise<StripeCustomer | null>;

  getByEmail(email: string): Promise<StripeCustomer | null>;

  getAll(): Promise<StripeCustomer[]>;
}

class StripeCustomerRepositoryImpl implements StripeCustomerRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getOneCustomer(rows: any[]): StripeCustomer {
    const customer = this.getOptionalCustomer(rows);
    if (customer === null) {
      throw new Error("Customer not found");
    }
    return customer;
  }

  private getOptionalCustomer(rows: any[]): StripeCustomer | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple customers found");
    } else {
      const customer = StripeCustomer.fromBackend(rows[0]);
      if (customer instanceof Error) {
        throw customer;
      }
      return customer;
    }
  }

  private getCustomerList(rows: any[]): StripeCustomer[] {
    return rows.map((row) => {
      const customer = StripeCustomer.fromBackend(row);
      if (customer instanceof Error) {
        throw customer;
      }
      return customer;
    });
  }

  async getAll(): Promise<StripeCustomer[]> {
    const result = await this.pool.query(`
            SELECT *
            FROM stripe_customer
        `);

    return this.getCustomerList(result.rows);
  }

  async getByStripeId(id: StripeCustomerId): Promise<StripeCustomer | null> {
    const result = await this.pool.query(
      `
                SELECT *
                FROM stripe_customer
                WHERE stripe_id = $1
            `,
      [id.id],
    );

    return this.getOptionalCustomer(result.rows);
  }

  async getByEmail(email: string): Promise<StripeCustomer | null> {
    const result = await this.pool.query(
      `
                SELECT *
                FROM stripe_customer
                WHERE email = $1
            `,
      [email],
    );

    return this.getOptionalCustomer(result.rows);
  }

  async insert(customer: StripeCustomer): Promise<StripeCustomer> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `
        INSERT INTO stripe_customer (stripe_id,
                                   currency,
                                   email,
                                   name,
                                   phone,
                                   preferred_locales,
                                   address_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
        [
          customer.stripeId.id,
          customer.currency || null,
          customer.email || null,
          customer.name || null,
          customer.phone || null,
          customer.preferredLocales || null,
          customer.addressId?.uuid || null,
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
