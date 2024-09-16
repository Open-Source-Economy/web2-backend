import { Pool } from "pg";
import { StripeCustomer, StripeCustomerId } from "../../model";
import { getPool } from "../../dbPool";

export function getStripeCustomerRepository(): StripeCustomerRepository {
  return new StripeCustomerRepositoryImpl(getPool());
}

export interface StripeCustomerRepository {
  insert(customer: StripeCustomer): Promise<StripeCustomer>;
  getById(id: StripeCustomerId): Promise<StripeCustomer | null>;
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
    } else {
      return customer;
    }
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
    return rows.map((r) => {
      const customer = StripeCustomer.fromBackend(r);
      if (customer instanceof Error) {
        throw customer;
      }
      return customer;
    });
  }

  async getAll(): Promise<StripeCustomer[]> {
    const result = await this.pool.query(`
            SELECT stripe_id, user_id, company_id
            FROM stripe_customer
        `);

    return this.getCustomerList(result.rows);
  }

  async getById(id: StripeCustomerId): Promise<StripeCustomer | null> {
    const result = await this.pool.query(
      `
                SELECT stripe_id, user_id, company_id
                FROM stripe_customer
                WHERE stripe_id = $1
            `,
      [id.toString()],
    );

    return this.getOptionalCustomer(result.rows);
  }

  async insert(customer: StripeCustomer): Promise<StripeCustomer> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `
                    INSERT INTO stripe_customer (stripe_id, user_id, company_id)
                    VALUES ($1, $2, $3)
                    RETURNING stripe_id, user_id, company_id
                `,
        [
          customer.stripeId.toString(),
          customer.userId.toString(),
          customer.companyId ? customer.companyId.toString() : null,
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
