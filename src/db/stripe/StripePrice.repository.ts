import { Pool } from "pg";
import { pool } from "../../dbPool";
import {
  CampaignPriceType,
  Currency,
  StripePrice,
  StripePriceId,
  StripeProductId,
} from "../../api/model";

export function getStripePriceRepository(): StripePriceRepository {
  return new StripePriceRepositoryImpl(pool);
}

export interface StripePriceRepository {
  createOrUpdate(price: StripePrice): Promise<StripePrice>;
  getById(id: StripePriceId): Promise<StripePrice | null>;
  getActiveCampaignPricesByProductId(
    productId: StripeProductId,
  ): Promise<Record<Currency, [CampaignPriceType, StripePrice][]>>;
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
      [id.id],
    );
    return this.getOptionalPrice(result.rows);
  }

  async getActiveCampaignPricesByProductId(
    productId: StripeProductId,
  ): Promise<Record<Currency, [CampaignPriceType, StripePrice][]>> {
    const result = await this.pool.query(
      `
        SELECT *
        FROM stripe_price
        WHERE product_id = $1 
          AND type IN (${Object.values(CampaignPriceType)
            .map((type) => `'${type}'`)
            .join(", ")})
      `,
      [productId.id],
    );

    const priceList = this.getPriceList(result.rows);

    const pricesByCurrency: Record<
      Currency,
      [CampaignPriceType, StripePrice][]
    > = {} as Record<Currency, [CampaignPriceType, StripePrice][]>;
    // Group prices by currency
    for (const price of priceList) {
      if (!pricesByCurrency[price.currency]) {
        pricesByCurrency[price.currency] = [];
      }
      if (price.active) {
        pricesByCurrency[price.currency].push([
          // @ts-ignore: Cast is safe because we filtered for campaign price types in the query
          price.type as CampaignPriceType,
          price,
        ]);
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

  async createOrUpdate(price: StripePrice): Promise<StripePrice> {
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
      ON CONFLICT (stripe_id) DO UPDATE SET
        product_id = $2,
        unit_amount = $3,
        currency = $4,
        active = $5,
        type = $6
      RETURNING stripe_id, product_id, unit_amount, currency, active, type
    `,
        [
          price.stripeId.id,
          price.productId.id,
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
