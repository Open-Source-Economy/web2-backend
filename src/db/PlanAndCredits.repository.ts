import { Pool } from "pg";
import {
  CompanyId,
  PlanPriceType,
  PlanProductType,
  ProductType,
  productTypeUtils,
  UserId,
} from "@open-source-economy/api-types";
import { pool } from "../dbPool";
import { getManualInvoiceRepository } from "./ManualInvoice.repository";
import { logger } from "../config";

export function getCreditRepository(): PlanAndCreditsRepository {
  return new CreditRepositoryImpl(pool);
}

// TODO: optimize this implementation
export interface PlanAndCreditsRepository {
  /**
   * Return minutes of credit available for the user.
   * @param userId
   * @param companyId If provided, returns the amount of the company
   */
  getAvailableCredit(userId: UserId, companyId?: CompanyId): Promise<number>;

  getPlan(
    userId: UserId,
    companyId?: CompanyId,
  ): Promise<[PlanProductType, PlanPriceType] | null>;
}

class CreditRepositoryImpl implements PlanAndCreditsRepository {
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
      return acc + invoice.creditAmount; // invoice.creditAmount is an integer
    }, 0);
    logger.debug(`Total Credit from manual invoices: ${totalCreditsPaid}`);

    // Calculate total Credit from Stripe invoices
    const amountPaidWithStripe: number = await this.getAllStripeInvoicePaidBy(
      companyId ?? userId,
    );
    logger.debug(`Total Credit from Stripe invoices: ${amountPaidWithStripe}`);
    totalCreditsPaid += amountPaidWithStripe;

    const totalFunding: number = await this.getIssueFundingFrom(
      companyId ?? userId,
    );
    logger.debug(`Total issue funding: ${totalFunding}`);

    const availableCredits = totalCreditsPaid - totalFunding;
    logger.debug(`Total available credits: ${availableCredits}`);

    if (totalFunding < 0) {
      logger.error(
        `The amount dow amount (${totalFunding}) is negative for userId ${userId.uuid}, companyId ${companyId ? companyId.uuid : ""}`,
      );
    } else if (availableCredits < 0) {
      logger.error(
        `The total Credit paid (${totalCreditsPaid}) is less than the total funding (${totalFunding}) for userId ${userId.uuid}, companyId ${companyId ? companyId.uuid : ""}`,
      );
    }

    return availableCredits;
  }

  /**
   * Gets the plan product type from the last invoice for a user or company
   * @param userId - The user ID
   * @param companyId - Optional company ID if checking company plan
   * @returns The plan product type or null if no plan exists
   */
  async getPlan(
    userId: UserId,
    companyId?: CompanyId,
  ): Promise<[PlanProductType, PlanPriceType] | null> {
    // TODO: hack solution, refactor to use Stripe API subscription
    try {
      // Get all plan product types from the enum
      const planProductTypes = Object.values(PlanProductType);
      const planPriceTypes = Object.values(PlanPriceType);

      const selectClause = `
    SELECT sp.type as product_type, spr.type as price_type
    FROM stripe_invoice si
    JOIN stripe_invoice_line sil ON si.stripe_id = sil.invoice_id
    JOIN stripe_product sp ON sil.product_id = sp.stripe_id
    JOIN stripe_price spr ON sil.price_id = spr.stripe_id
  `;

      const planFilterClause = `
    AND sp.type IN (${planProductTypes.map((_, i) => `$${i + 2}`).join(", ")})
      AND spr.type IN (${planPriceTypes.map((_, i) => `$${i + 2 + planProductTypes.length}`).join(", ")})
      ORDER BY si.created_at DESC
      LIMIT 1
    `;

      let query: string;
      let params: any[] = [];

      if (companyId) {
        // Query for company's last invoice plan type
        query = `
      ${selectClause}
      JOIN stripe_customer_user scu ON si.stripe_customer_id = scu.stripe_customer_id
      JOIN user_company uc ON scu.user_id = uc.user_id
      WHERE uc.company_id = $1
      ${planFilterClause}
      
    `;
        params = [companyId.uuid, ...planProductTypes, ...planPriceTypes];
      } else {
        // Query for individual user's last invoice plan type
        query = `
      ${selectClause}
      JOIN stripe_customer_user scu ON si.stripe_customer_id = scu.stripe_customer_id
      WHERE scu.user_id = $1
       ${planFilterClause}
    `;
        params = [userId.uuid, ...planProductTypes, ...planPriceTypes];
      }

      const result = await this.pool.query(query, params);

      if (result.rowCount === 0) {
        return null;
      }

      const productType = result.rows[0].product_type as string;
      const priceType = result.rows[0].price_type as string;

      // Check if it's a valid plan product type
      if (
        Object.values(PlanProductType).includes(
          productType as PlanProductType,
        ) &&
        Object.values(PlanPriceType).includes(priceType as PlanPriceType)
      ) {
        return [productType as PlanProductType, priceType as PlanPriceType];
      } else {
        logger.error(
          `Invalid plan product type ${productType} or price type ${priceType} from last invoice`,
        );
        return null;
      }
    } catch (error) {
      logger.error(
        "Error retrieving plan product type from last invoice",
        error,
      );
      throw new Error("Failed to retrieve plan product type from last invoice");
    }
  }

  private async getAllStripeInvoicePaidBy(
    id: CompanyId | UserId,
  ): Promise<number> {
    // Common CASE expression for all product types
    const creditCalcCase = `
    CASE
      WHEN sp.type = '${ProductType.CREDIT}' THEN sl.quantity
      WHEN sp.type = '${ProductType.INDIVIDUAL_PLAN}' THEN sl.quantity * ${productTypeUtils.credits(ProductType.INDIVIDUAL_PLAN)}
      WHEN sp.type = '${ProductType.START_UP_PLAN}' THEN sl.quantity * ${productTypeUtils.credits(ProductType.START_UP_PLAN)}
      WHEN sp.type = '${ProductType.SCALE_UP_PLAN}' THEN sl.quantity * ${productTypeUtils.credits(ProductType.SCALE_UP_PLAN)}
      WHEN sp.type = '${ProductType.ENTERPRISE_PLAN}' THEN sl.quantity * ${productTypeUtils.credits(ProductType.ENTERPRISE_PLAN)}
      ELSE 0
    END`;

    // Common query parts
    const selectClause = `SELECT SUM(${creditCalcCase}) AS total_credit_paid`;
    const fromClause = `FROM stripe_invoice_line sl
                      JOIN stripe_product sp ON sl.product_id = sp.stripe_id
                      JOIN stripe_invoice si ON sl.invoice_id = si.stripe_id`;
    const paidCondition = `AND si.paid = TRUE`;

    let query: string;

    if (id instanceof CompanyId) {
      query = `
      ${selectClause}
      ${fromClause}
      WHERE sl.stripe_customer_id IN
            (SELECT sc.stripe_customer_id
             FROM user_company uc
                  JOIN stripe_customer_user sc ON uc.company_id = $1 AND uc.user_id = sc.user_id)
      ${paidCondition}
    `;
    } else {
      query = `
      ${selectClause}
      ${fromClause}
      JOIN stripe_customer_user sc ON sl.stripe_customer_id = sc.stripe_customer_id
      WHERE sc.user_id = $1
      ${paidCondition}
    `;
    }

    try {
      const result = await this.pool.query(query, [id.uuid]);
      const total = result.rows[0]?.total_credit_paid ?? 0;
      return Number(total);
    } catch (error) {
      logger.error("Error executing query", error);
      throw new Error("Failed to retrieve paid invoice total");
    }
  }

  // result is in credit
  private async getIssueFundingFrom(id: CompanyId | UserId): Promise<number> {
    // Common query parts
    const selectClause = `SELECT SUM(if.credit_amount) AS total_funding`;
    const issueJoinClause = `LEFT JOIN managed_issue mi ON if.github_issue_id = mi.github_issue_id`;
    const rejectionCondition = `AND (mi.state != 'rejected' OR mi.state is NULL)`;

    let query: string;

    if (id instanceof CompanyId) {
      query = `
      ${selectClause}
      FROM issue_funding if
      JOIN user_company uc ON if.user_id = uc.user_id
      ${issueJoinClause}
      WHERE uc.company_id = $1
      ${rejectionCondition}
    `;
    } else {
      query = `
      ${selectClause}
      FROM issue_funding if
      ${issueJoinClause}
      WHERE if.user_id = $1
      ${rejectionCondition}
    `;
    }

    try {
      const result = await this.pool.query(query, [id.uuid]);
      const total = result.rows[0]?.total_funding ?? 0;
      return Number(total);
    } catch (error) {
      logger.error("Error executing query", error);
      throw new Error("Failed to retrieve total funding amount");
    }
  }
}
