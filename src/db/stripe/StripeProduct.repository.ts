import { Pool } from "pg";
import { pool } from "../../dbPool";
import {
  CampaignProductType,
  ProjectId,
  ProjectUtils,
  RepositoryId,
  StripeProduct,
  StripeProductId,
} from "@open-source-economy/api-types";

export function getStripeProductRepository(): StripeProductRepository {
  return new StripeProductRepositoryImpl(pool);
}

export interface StripeProductRepository {
  insert(product: StripeProduct): Promise<StripeProduct>;

  getById(id: StripeProductId): Promise<StripeProduct | null>;

  getCampaignProduct(
    projectId: ProjectId,
  ): Promise<[CampaignProductType, StripeProduct][]>;

  getAll(): Promise<StripeProduct[]>;
}

class StripeProductRepositoryImpl implements StripeProductRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getOneProduct(rows: any[]): StripeProduct {
    const product = this.getOptionalProduct(rows);
    if (product === null) {
      throw new Error("Product not found");
    } else {
      return product;
    }
  }

  private getOptionalProduct(rows: any[]): StripeProduct | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple products found");
    } else {
      const product = StripeProduct.fromBackend(rows[0]);
      if (product instanceof Error) {
        throw product;
      }
      return product;
    }
  }

  private getProductList(rows: any[]): StripeProduct[] {
    return rows.map((r) => {
      const product = StripeProduct.fromBackend(r);
      if (product instanceof Error) {
        throw product;
      }
      return product;
    });
  }

  async getAll(): Promise<StripeProduct[]> {
    const result = await this.pool.query(`
            SELECT *
            FROM stripe_product
        `);

    return this.getProductList(result.rows);
  }

  async getById(id: StripeProductId): Promise<StripeProduct | null> {
    const result = await this.pool.query(
      `
                SELECT *
                FROM stripe_product
                WHERE stripe_id = $1
            `,
      [id.id],
    );

    return this.getOptionalProduct(result.rows);
  }

  async getCampaignProduct(
    projectId: ProjectId,
  ): Promise<[CampaignProductType, StripeProduct][]> {
    const campaignProductTypesClause = `
    AND type IN (${Object.values(CampaignProductType)
      .map((type) => `'${type}'`)
      .join(", ")})
  `;

    const login =
      projectId instanceof RepositoryId
        ? projectId.ownerId.login
        : projectId.login;
    const name = projectId instanceof RepositoryId ? projectId.name : null;

    let result = await this.pool.query(
      `
        SELECT *
        FROM stripe_product
        WHERE github_owner_login = $1
          AND github_repository_name = $2
          ${campaignProductTypesClause}
      `,
      [login, name],
    );

    // Use existing helper to get products
    const products = this.getProductList(result.rows);

    // Convert products to tuples of [CampaignProductType, StripeProduct]
    return products.map((product) => {
      // @ts-ignore: Cast is safe because we filtered for campaign product types in the query
      const campaignProductType = product.type as CampaignProductType;
      return [campaignProductType, product];
    });
  }

  async insert(product: StripeProduct): Promise<StripeProduct> {
    const client = await this.pool.connect();
    const { ownerId, ownerLogin, repoId, repoName } = ProjectUtils.getDBParams(
      product.projectId,
    );

    try {
      const result = await client.query(
        `
        INSERT INTO stripe_product (
          stripe_id,
          type,
          github_owner_id,
          github_owner_login,
          github_repository_id,
          github_repository_name
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING stripe_id, type, github_owner_id, github_owner_login, github_repository_id, github_repository_name
      `,
        [
          product.stripeId.id,
          product.type,
          ownerId,
          ownerLogin,
          repoId,
          repoName,
        ],
      );

      return this.getOneProduct(result.rows);
    } finally {
      client.release();
    }
  }
}
