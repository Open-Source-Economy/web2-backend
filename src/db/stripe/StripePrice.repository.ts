import { Pool } from "pg";
import { getPool } from "../../dbPool";
import {
  Currency,
  StripePrice,
  StripePriceId,
  StripeProductId,
} from "../../model";

export function getStripePriceRepository(): StripePriceRepository {
  return new StripePriceRepositoryImpl(getPool());
}

export interface StripePriceRepository {
  insert(price: StripePrice): Promise<StripePrice>;
  getById(id: StripePriceId): Promise<StripePrice | null>;
  getActivePricesByProductId(
    productId: StripeProductId,
  ): Promise<Record<Currency, StripePrice[]>>;
  getAll(): Promise<StripePrice[]>;
}

class StripePriceRepositoryImpl implements StripePriceRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getOnePrice(rows: any[]): StripePrice {
    const price = this.getOptionalPrice(rows);
    if (price === null) {
      throw new Error("Price not found");
    } else {
      return price;
    }
  }

  private getOptionalPrice(rows: any[]): StripePrice | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple prices found");
    } else {
      const price = StripePrice.fromBackend(rows[0]);
      if (price instanceof Error) {
        // We re-throw any validation errors
        throw price;
      }
      return price;
    }
  }

  private getPriceList(rows: any[]): StripePrice[] {
    return rows.map((r) => {
      const price = StripePrice.fromBackend(r);
      if (price instanceof Error) {
        throw price;
      }
      return price;
    });
  }

  async getById(id: StripePriceId): Promise<StripePrice | null> {
    const result = await this.pool.query(
      `
        SELECT *
        FROM stripe_price
        WHERE stripe_id = $1
      `,
      [id.toString()],
    );
    return this.getOptionalPrice(result.rows);
  }

  async getActivePricesByProductId(
    productId: StripeProductId,
  ): Promise<Record<Currency, StripePrice[]>> {
    const result = await this.pool.query(
      `
        SELECT *
        FROM stripe_price
        WHERE product_id = $1
      `,
      [productId.toString()],
    );

    const priceList = this.getPriceList(result.rows);

    const pricesByCurrency: Record<Currency, StripePrice[]> = {} as Record<
      Currency,
      StripePrice[]
    >;
    // Group prices by currency
    for (const price of priceList) {
      if (!pricesByCurrency[price.currency]) {
        pricesByCurrency[price.currency] = [];
      }
      if (price.active) {
        pricesByCurrency[price.currency].push(price);
      }
    }

    return pricesByCurrency;
  }

  async getAll(): Promise<StripePrice[]> {
    const result = await this.pool.query(`
      SELECT *
      FROM stripe_price
    `);

    return this.getPriceList(result.rows);
  }

  async insert(price: StripePrice): Promise<StripePrice> {
    if (price.unitAmount <= 0) {
      throw new Error("Unit amount must be greater than 0");
    }

    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
        INSERT INTO stripe_price (stripe_id,
                                  product_id,
                                  unit_amount,
                                  currency,
                                  active,
                                  type)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING stripe_id, product_id, unit_amount, currency, active, type
      `,
        [
          price.stripeId.toString(),
          price.productId.toString(),
          price.unitAmount,
          price.currency,
          price.active,
          price.type,
        ],
      );

      return this.getOnePrice(result.rows);
    } finally {
      client.release();
    }
  }
}
