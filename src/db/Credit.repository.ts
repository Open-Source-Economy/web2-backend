import { Pool } from "pg";
import { CompanyId, ProductType, UserId } from "../model";
import { pool } from "../dbPool";
import { getManualInvoiceRepository } from "./ManualInvoice.repository";
import { logger } from "../config";

export function getCreditRepository(): CreditRepository {
  return new CreditRepositoryImpl(pool);
}

// TODO: optimize this implementation
export interface CreditRepository {
  /**
   * Return minutes of credit available for the user.
   * @param userId
   * @param companyId If provided, returns the amount of the company
   */
  getAvailableCredit(userId: UserId, companyId?: CompanyId): Promise<number>;
}

class CreditRepositoryImpl implements CreditRepository {
  pool: Pool;

  manualInvoiceRepo = getManualInvoiceRepository();

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async getAvailableCredit(
    userId: UserId,
    companyId?: CompanyId,
  ): Promise<number> {
    logger.debug(
      `Getting available credit for user ${userId} and company ${companyId}...`,
    );
    let totalCreditsPaid: number = 0;

    // Calculate total Credit from manual invoices
    const manualInvoices = await this.manualInvoiceRepo.getAllInvoicePaidBy(
      companyId ?? userId,
    );

    totalCreditsPaid += manualInvoices.reduce((acc, invoice) => {
      return acc + invoice.creditAmount; // invoice.milliDowAmount is an integer
    }, 0);
    logger.debug(`Total Credit from manual invoices: ${totalCreditsPaid}`);

    // Calculate total Credit from Stripe invoices
    const amountPaidWithStripe = await this.getAllStripeInvoicePaidBy(
      companyId ?? userId,
    );
    logger.debug(`Total Credit from Stripe invoices: ${amountPaidWithStripe}`);
    totalCreditsPaid += amountPaidWithStripe;

    const totalFunding = await this.getIssueFundingFrom(companyId ?? userId);
    const availableMilliCredits = totalCreditsPaid - totalFunding;
    logger.debug(`Total issue funding: ${totalFunding}`);
    if (totalFunding < 0) {
      logger.error(
        `The amount dow amount (${totalFunding}) is negative for userId ${userId.uuid}, companyId ${companyId ? companyId.uuid : ""}`,
      );
    } else if (availableMilliCredits < 0) {
      logger.error(
        `The total Credit paid (${totalCreditsPaid}) is less than the total funding (${totalFunding}) for userId ${userId.uuid}, companyId ${companyId ? companyId.uuid : ""}`,
      );
    }

    return availableMilliCredits;
  }

  private async getAllStripeInvoicePaidBy(
    id: CompanyId | UserId,
  ): Promise<number> {
    let result;

    // TODO: potential lost of precision with the numbers
    if (id instanceof CompanyId) {
      const query = `
          SELECT SUM(sl.quantity) AS total_milli_dow_paid
          FROM stripe_invoice_line sl
                   JOIN stripe_product sp ON sl.product_id = sp.stripe_id
                   JOIN stripe_invoice si ON sl.invoice_id = si.stripe_id
          WHERE sl.stripe_customer_id IN
                (SELECT sc.stripe_customer_id
                 FROM user_company uc
                          JOIN stripe_customer_user sc ON uc.company_id = $1 AND uc.user_id = sc.user_id)
            AND sp.type = '${ProductType.credit}'
            AND si.paid = TRUE
      `;
      result = await this.pool.query(query, [id.uuid]);
    } else {
      const query = `
        SELECT SUM(sl.quantity) AS total_milli_dow_paid
        FROM stripe_invoice_line sl
               JOIN stripe_product sp ON sl.product_id = sp.stripe_id
               JOIN stripe_invoice si ON sl.invoice_id = si.stripe_id
               JOIN stripe_customer_user sc ON sl.stripe_customer_id = sc.stripe_customer_id
        WHERE sc.user_id = $1
          AND sp.type = '${ProductType.credit}'
          AND si.paid = true
            `;
      result = await this.pool.query(query, [id.uuid]);
    }

    try {
      return result.rows[0]?.total_milli_dow_paid ?? 0;
    } catch (error) {
      logger.error("Error executing query", error);
      throw new Error("Failed to retrieve paid invoice total");
    }
  }

  // result is in milli Credit
  private async getIssueFundingFrom(id: CompanyId | UserId): Promise<number> {
    let result;

    // TODO: potential lost of precision with the numbers
    if (id instanceof CompanyId) {
      const query = `
                SELECT SUM(if.milli_dow_amount) AS total_funding
                FROM issue_funding if
                         JOIN user_company uc ON if.user_id = uc.user_id
                         LEFT JOIN managed_issue mi ON if.github_issue_id = mi.github_issue_id
                WHERE uc.company_id = $1
                  AND (mi.state != 'rejected' OR mi.state is NULL)
            `;
      result = await this.pool.query(query, [id.uuid]);
    } else {
      const query = `
                SELECT SUM(if.milli_dow_amount) AS total_funding
                FROM issue_funding if
                         LEFT JOIN managed_issue mi ON if.github_issue_id = mi.github_issue_id
                WHERE if.user_id = $1
                  AND (mi.state != 'rejected' OR mi.state is NULL)
            `;
      result = await this.pool.query(query, [id.uuid]);
    }

    try {
      return result.rows[0]?.total_funding ?? 0;
    } catch (error) {
      logger.error("Error executing query", error);
      throw new Error("Failed to retrieve total funding amount");
    }
  }
}
