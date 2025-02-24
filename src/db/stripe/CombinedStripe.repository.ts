import { Pool } from "pg";
import {
  CampaignPriceType,
  CampaignProductType,
  Currency,
  ProjectId,
  RepositoryId,
  StripePrice,
  StripeProduct,
} from "../../model";
import { pool } from "../../dbPool";

type CurrencyPrices<PriceType> = Record<Currency, [PriceType, StripePrice][]>;

export function getCombinedStripeRepository(): CombinedStripeRepository {
  return new CombinedStripeRepositoryImpl(pool);
}

export interface CombinedStripeRepository {
  getCampaignProductsWithPrices(
    projectId: ProjectId,
  ): Promise<
    [CampaignProductType, StripeProduct, CurrencyPrices<CampaignPriceType>][]
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

  async getCampaignProductsWithPrices(
    projectId: ProjectId,
  ): Promise<
    [CampaignProductType, StripeProduct, CurrencyPrices<CampaignPriceType>][]
  > {
    const campaignProductTypesClause = `
            AND stripe_product.type IN (${Object.values(CampaignProductType)
              .map((type) => `'${type}'`)
              .join(", ")})
        `;

    const campaignPriceTypesClause = `
            AND stripe_price.type IN (${Object.values(CampaignPriceType)
              .map((type) => `'${type}'`)
              .join(", ")})
        `;

    let params;
    if (projectId instanceof RepositoryId) {
      params = [projectId.ownerId.login, projectId.name];
    } else {
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
                    ${campaignProductTypesClause}
                    ${campaignPriceTypesClause}
            `,
      params,
    );

    // Group rows by product
    const productMap = new Map<string, any[]>();
    for (const row of result.rows) {
      console.debug("From DB", row);
      const productId = row.stripe_id;
      if (!productMap.has(productId)) {
        productMap.set(productId, []);
      }
      productMap.get(productId)!.push(row);
    }

    // Process each product and its prices
    const output: [
      CampaignProductType,
      StripeProduct,
      CurrencyPrices<CampaignPriceType>,
    ][] = [];

    for (const rows of productMap.values()) {
      const product = this.getProductFromRow(rows[0]);
      // @ts-ignore: Cast is safe because we filtered for campaign price types in the query
      const campaignProductType = product.type as CampaignProductType;

      // Initialize prices by currency using the CurrencyPrices type
      const pricesByCurrency: CurrencyPrices<CampaignPriceType> =
        {} as CurrencyPrices<CampaignPriceType>;

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
              pricesByCurrency[price.currency] = [];
            }
            pricesByCurrency[price.currency].push([
              //   @ts-ignore: Cast is safe because we filtered for campaign price types in the query
              price.type as CampaignPriceType,
              price,
            ]);
          }
        }
      }

      output.push([campaignProductType, product, pricesByCurrency]);
    }

    return output;
  }
}
