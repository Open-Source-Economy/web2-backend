import { Pool } from "pg";
import { Currency, RepositoryId } from "../../model";
import { getPool } from "../../dbPool";

export function getStripeMiscellaneousRepository(): StripeMiscellaneousRepository {
  return new StripeMiscellaneousRepositoryImpl(getPool());
}

export interface StripeMiscellaneousRepository {
  getRaisedAmountPerCurrency(
    repositoryId: RepositoryId,
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
    repositoryId: RepositoryId,
  ): Promise<Record<Currency, number>> {
    const query = `
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
          AND sp.github_repository_name = $2
        GROUP BY sp.github_owner_login,
                 sp.github_repository_name,
                 si.currency
        ORDER BY sp.github_owner_login,
                 sp.github_repository_name,
                 si.currency;
    `;
    const result = await this.pool.query(query, [
      repositoryId.ownerId.login,
      repositoryId.name,
    ]);

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
