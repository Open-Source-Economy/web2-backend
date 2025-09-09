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
} from "@open-source-economy/api-types";
import { pool } from "../../dbPool";
import { logger } from "../../config";

export function getCombinedStripeRepository(): CombinedStripeRepository {
  return new CombinedStripeRepositoryImpl(pool);
}

export interface CombinedStripeRepository {
  getCampaignProductsWithPrices(
    projectId: ProjectId,
  ): Promise<
    Record<
      CampaignProductType,
      Record<Currency, Record<CampaignPriceType, StripePrice>>
    >
  >;

  getPlanProductsWithPrices(): Promise<
    Record<
      PlanProductType,
      Record<Currency, Record<PlanPriceType, StripePrice>>
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
  ): Promise<Record<string, Record<Currency, Record<string, StripePrice>>>> {
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

    let whereClause = "";
    let params: any[] = [];

    // Only apply GitHub repository/owner filters when projectId is provided
    if (projectId) {
      if (projectId instanceof RepositoryId) {
        logger.debug(
          `Fetching products for repository ${projectId.ownerId.login}/${projectId.name}`,
        );
        whereClause = `WHERE stripe_product.github_owner_login = $1
        AND stripe_product.github_repository_name = $2`;
        params = [projectId.ownerId.login, projectId.name];
      } else if (projectId instanceof OwnerId) {
        logger.debug(`Fetching products for owner ${projectId.login}`);
        whereClause = `WHERE stripe_product.github_owner_login = $1
        AND (stripe_product.github_repository_name IS NULL)`;
        params = [projectId.login];
      }
    } else {
      // For plans, we don't want to filter by GitHub owner/repo
      whereClause = "WHERE 1=1"; // Always true condition
      params = [];
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
          ${whereClause}
            ${productTypesClause}
            ${priceTypesClause}
        `,
      params,
    );

    logger.debug("Fetched products with prices", result.rows);

    // Rest of the method remains the same
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
      Record<Currency, Record<string, StripePrice>>
    > = {};

    for (const rows of productMap.values()) {
      const product = this.getProductFromRow(rows[0]);
      const productType = product.type;

      // Initialize prices by currency
      const pricesByCurrency = {} as Record<
        Currency,
        Record<string, StripePrice>
      >;

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
      output[productType] = pricesByCurrency;
    }

    // Validate that all expected entries are present
    this.validateResultCompleteness(output, productTypes, priceTypes);

    return output;
  }

  private validateResultCompleteness(
    output: Record<string, Record<Currency, Record<string, StripePrice>>>,
    expectedProductTypes: string[],
    expectedPriceTypes: string[],
  ): void {
    // 1. Validate product types
    for (const productType of expectedProductTypes) {
      if (!output[productType]) {
        logger.error(`Missing product type: ${productType}`, output);
        throw new Error(`Missing product type: ${productType}`);
      }
    }

    // 2. Collect all currencies from all products
    const allCurrencies = new Set<Currency>();
    for (const productType in output) {
      const currencies = Object.keys(output[productType]) as Currency[];
      currencies.forEach((currency) => allCurrencies.add(currency));
    }

    // 3. Check each product for price types and currencies
    for (const productType in output) {
      const productPrices = output[productType];

      // Check that the product has all currencies
      for (const currency of allCurrencies) {
        if (!productPrices[currency]) {
          logger.error(
            `Missing currency "${currency}" for product "${productType}"`,
            output,
          );
          throw new Error(
            `Missing currency "${currency}" for product "${productType}". All products must support the same set of currencies.`,
          );
        }

        // Check that all price types exist for each currency
        const currencyPrices = productPrices[currency];
        for (const priceType of expectedPriceTypes) {
          if (!currencyPrices[priceType]) {
            logger.error(
              `Missing price type "${priceType}" for product "${productType}" in currency "${currency}"`,
              output,
            );
            throw new Error(
              `Missing price type "${priceType}" for product "${productType}" in currency "${currency}"`,
            );
          }
        }
      }
    }
  }

  async getCampaignProductsWithPrices(
    projectId: ProjectId,
  ): Promise<
    Record<
      CampaignProductType,
      Record<Currency, Record<CampaignPriceType, StripePrice>>
    >
  > {
    const result = await this.getProductsWithPrices(
      Object.values(CampaignProductType),
      Object.values(CampaignPriceType),
      projectId,
    );

    return result as unknown as Record<
      CampaignProductType,
      Record<Currency, Record<CampaignPriceType, StripePrice>>
    >;
  }

  async getPlanProductsWithPrices(): Promise<
    Record<
      PlanProductType,
      Record<Currency, Record<PlanPriceType, StripePrice>>
    >
  > {
    const result = await this.getProductsWithPrices(
      Object.values(PlanProductType),
      Object.values(PlanPriceType),
    );

    return result as unknown as Record<
      PlanProductType,
      Record<Currency, Record<PlanPriceType, StripePrice>>
    >;
  }
}
