import { Pool } from "pg";
import {
  CampaignPriceType,
  CampaignProductType,
  Currency,
  OwnerId,
  PlanPriceType,
  PlanProductType,
  ProjectId,
  RepositoryId,
  StripePrice,
  StripeProduct,
} from "../../model";
import { pool } from "../../dbPool";

export function getCombinedStripeRepository(): CombinedStripeRepository {
  return new CombinedStripeRepositoryImpl(pool);
}

export interface CombinedStripeRepository {
  getCampaignProductsWithPrices(
    projectId: ProjectId,
  ): Promise<
    Record<
      CampaignProductType,
      [StripeProduct, Record<Currency, Record<CampaignPriceType, StripePrice>>]
    >
  >;

  getPlanProductsWithPrices(): Promise<
    Record<
      PlanProductType,
      [StripeProduct, Record<Currency, Record<PlanPriceType, StripePrice>>]
    >
  >;
}

export class CombinedStripeRepositoryImpl implements CombinedStripeRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getProductFromRow(row: any): StripeProduct {
    const product = StripeProduct.fromBackend(row);
    if (product instanceof Error) {
      throw product;
    }
    return product;
  }

  private getPriceFromRow(row: any): StripePrice {
    const price = StripePrice.fromBackend(row);
    if (price instanceof Error) {
      throw price;
    }
    return price;
  }

  private async getProductsWithPrices(
    productTypes: string[],
    priceTypes: string[],
    projectId?: ProjectId,
  ): Promise<
    Record<
      string,
      [StripeProduct, Record<Currency, Record<string, StripePrice>>]
    >
  > {
    const productTypesClause = `
      AND stripe_product.type IN (${productTypes
        .map((type) => `'${type}'`)
        .join(", ")})
    `;

    const priceTypesClause = `
      AND stripe_price.type IN (${priceTypes
        .map((type) => `'${type}'`)
        .join(", ")})
    `;

    let params: [string | null, string | null] = [null, null];
    if (projectId instanceof RepositoryId) {
      params = [projectId.ownerId.login, projectId.name];
    } else if (projectId instanceof OwnerId) {
      params = [projectId.login, null];
    }

    const result = await this.pool.query(
      `
          SELECT
            stripe_product.*,
            stripe_price.stripe_id as price_stripe_id,
            stripe_price.product_id,
            stripe_price.unit_amount,
            stripe_price.currency,
            stripe_price.active as price_active,
            stripe_price.type as price_type
          FROM stripe_product
                 LEFT JOIN stripe_price ON stripe_product.stripe_id = stripe_price.product_id
          WHERE stripe_product.github_owner_login = $1
            AND stripe_product.github_repository_name = $2
            ${productTypesClause}
            ${priceTypesClause}
        `,
      params,
    );

    // Group rows by product
    const productMap = new Map<string, any[]>();
    for (const row of result.rows) {
      const productId = row.stripe_id;
      if (!productMap.has(productId)) {
        productMap.set(productId, []);
      }
      productMap.get(productId)!.push(row);
    }

    // Process each product and its prices
    const output: Record<
      string,
      [StripeProduct, Record<Currency, Record<string, StripePrice>>]
    > = {};

    for (const rows of productMap.values()) {
      const product = this.getProductFromRow(rows[0]);
      const productType = product.type;

      // Initialize prices by currency
      const pricesByCurrency: Record<
        Currency,
        Record<string, StripePrice>
      > = {} as Record<Currency, Record<string, StripePrice>>;

      for (const row of rows) {
        if (row.price_stripe_id) {
          const price = this.getPriceFromRow({
            stripe_id: row.price_stripe_id,
            product_id: row.product_id,
            unit_amount: row.unit_amount,
            currency: row.currency,
            active: row.price_active,
            type: row.price_type,
          });

          if (price.active) {
            if (!pricesByCurrency[price.currency]) {
              pricesByCurrency[price.currency] = {};
            }
            // Store price by its type
            pricesByCurrency[price.currency][price.type] = price;
          }
        }
      }

      // Store the product and its prices in the output object
      output[productType] = [product, pricesByCurrency];
    }

    // Validate that all expected entries are present
    this.validateProductRecordCompleteness(output, productTypes);

    return output;
  }

  private validateProductRecordCompleteness(
    productRecord: Record<
      string,
      [StripeProduct, Record<Currency, Record<string, StripePrice>>]
    >,
    expectedProductTypes: string[],
  ): void {
    // Check if all expected product types are present
    for (const productType of expectedProductTypes) {
      if (!productRecord[productType]) {
        throw new Error(`Missing product type: ${productType}`);
      }

      const [_, pricesByCurrency] = productRecord[productType];

      // Check if there's at least one currency with prices
      if (Object.keys(pricesByCurrency).length === 0) {
        throw new Error(`No currencies found for product type: ${productType}`);
      }

      // Check each currency has all required price types
      for (const currency of Object.keys(pricesByCurrency) as Currency[]) {
        const pricesByType = pricesByCurrency[currency];

        if (Object.keys(pricesByType).length === 0) {
          throw new Error(
            `No prices found for product type: ${productType}, currency: ${currency}`,
          );
        }
      }
    }
  }

  async getCampaignProductsWithPrices(
    projectId: ProjectId,
  ): Promise<
    Record<
      CampaignProductType,
      [StripeProduct, Record<Currency, Record<CampaignPriceType, StripePrice>>]
    >
  > {
    const result = await this.getProductsWithPrices(
      Object.values(CampaignProductType),
      Object.values(CampaignPriceType),
      projectId,
    );

    return result as unknown as Record<
      CampaignProductType,
      [StripeProduct, Record<Currency, Record<CampaignPriceType, StripePrice>>]
    >;
  }

  async getPlanProductsWithPrices(): Promise<
    Record<
      PlanProductType,
      [StripeProduct, Record<Currency, Record<PlanPriceType, StripePrice>>]
    >
  > {
    const result = await this.getProductsWithPrices(
      Object.values(PlanProductType),
      Object.values(PlanPriceType),
    );

    return result as unknown as Record<
      PlanProductType,
      [StripeProduct, Record<Currency, Record<PlanPriceType, StripePrice>>]
    >;
  }
}
