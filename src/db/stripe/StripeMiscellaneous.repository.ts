import { Pool } from "pg";
import {
  Currency,
  ProjectId,
  ProjectUtils,
} from "@open-source-economy/api-types";
import { pool } from "../../dbPool";

export function getStripeMiscellaneousRepository(): StripeMiscellaneousRepository {
  return new StripeMiscellaneousRepositoryImpl(pool);
}

export interface StripeMiscellaneousRepository {
  getRaisedAmountPerCurrency(
    projectId: ProjectId,
  ): Promise<Record<Currency, number>>; // in cents in the currency of the price
}

class StripeMiscellaneousRepositoryImpl
  implements StripeMiscellaneousRepository
{
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async getRaisedAmountPerCurrency(
    projectId: ProjectId,
  ): Promise<Record<Currency, number>> {
    const { ownerLogin, repoName } = ProjectUtils.getDBParams(projectId);

    // Base query with owner condition
    let query = `
      SELECT sp.github_owner_login,
             sp.github_repository_name,
             si.currency,
             SUM(si.total) as total_raised
      FROM stripe_invoice_line sil
               JOIN stripe_invoice si ON si.stripe_id = sil.invoice_id
               JOIN stripe_product sp ON sp.stripe_id = sil.product_id
      WHERE si.paid = true
        AND si.created_at >= date_trunc('month', current_date - interval '1' month)
        AND sp.github_owner_login = $1
  `;

    const params = [ownerLogin];

    // Add repository condition if it's a repository project
    if (repoName) {
      query += ` AND sp.github_repository_name = $2`;
      params.push(repoName);
    } else {
      query += ` AND sp.github_repository_name IS NULL`;
    }

    // Add group by and order by
    query += `
      GROUP BY sp.github_owner_login,
               sp.github_repository_name,
               si.currency
      ORDER BY sp.github_owner_login,
               sp.github_repository_name,
               si.currency;
  `;

    const result = await this.pool.query(query, params);
    // Initialize all currencies with 0 using Object.values(Currency)
    const totalRaised = Object.values(Currency).reduce(
      (acc, currency) => {
        acc[currency] = 0;
        return acc;
      },
      {} as Record<Currency, number>,
    );

    result.rows.forEach((row) => {
      totalRaised[row.currency.toLowerCase() as Currency] = Number(
        row.total_raised,
      );
    });

    return totalRaised;
  }
}
