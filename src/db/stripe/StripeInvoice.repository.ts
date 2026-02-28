import { Pool } from "pg";
import { CompanyId, StripeInvoice, StripeInvoiceId, StripeInvoiceLine, UserId } from "@open-source-economy/api-types";
import { pool } from "../../dbPool";
import { StripeInvoiceCompanion } from "../helpers/companions";
import { getStripeInvoiceLineRepository, StripeInvoiceLineRepository } from "./StripeInvoiceLine.repository";

export function getStripeInvoiceRepository(): StripeInvoiceRepository {
  return new StripeInvoiceRepositoryImpl(pool);
}

export interface StripeInvoiceRepository {
  insert(invoice: StripeInvoice, lines: StripeInvoiceLine[]): Promise<StripeInvoice>;
  getById(id: StripeInvoiceId): Promise<StripeInvoice | null>;
  getAllInvoicePaidByCompany(id: CompanyId): Promise<any[]>;
  getAllInvoicePaidByUser(id: UserId): Promise<any[]>;
}

class StripeInvoiceRepositoryImpl implements StripeInvoiceRepository {
  private pool: Pool;
  private stripeInvoiceLineRepository: StripeInvoiceLineRepository;

  constructor(pool: Pool) {
    this.pool = pool;
    this.stripeInvoiceLineRepository = getStripeInvoiceLineRepository();
  }

  private getOneInvoice(rows: any[]): StripeInvoice {
    const invoice = this.getOptionalInvoice(rows);
    if (invoice === null) {
      throw new Error("Invoice not found");
    } else {
      return invoice;
    }
  }

  private getOptionalInvoice(rows: any[]): StripeInvoice | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple invoices found");
    } else {
      const invoice = StripeInvoiceCompanion.fromBackend(rows[0]);
      if (invoice instanceof Error) {
        throw invoice;
      }
      return invoice;
    }
  }

  async getById(id: StripeInvoiceId): Promise<StripeInvoice | null> {
    const result = await this.pool.query(
      `
                SELECT *
                FROM stripe_invoice
                WHERE stripe_id = $1
            `,
      [id]
    );

    return this.getOptionalInvoice(result.rows);
  }

  async insert(invoice: StripeInvoice, lines: StripeInvoiceLine[]): Promise<StripeInvoice> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `
                    INSERT INTO stripe_invoice (
                        stripe_id,
                        stripe_customer_id,
                        paid,
                        account_country,
                        currency,
                        total,
                        total_excl_tax,
                        subtotal,
                        subtotal_excl_tax,
                        hosted_invoice_url,
                        invoice_pdf,
                        number
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    RETURNING
                        stripe_id,
                        stripe_customer_id,
                        paid,
                        account_country,
                        currency,
                        total,
                        total_excl_tax,
                        subtotal,
                        subtotal_excl_tax,
                        hosted_invoice_url,
                        invoice_pdf,
                        number
                `,
        [
          invoice.stripeId,
          invoice.customerId,
          invoice.paid,
          invoice.accountCountry,
          invoice.currency,
          invoice.total,
          invoice.totalExclTax,
          invoice.subtotal,
          invoice.subtotalExclTax,
          invoice.hostedInvoiceUrl,
          invoice.invoicePdf,
          invoice.number,
        ]
      );

      // Insert associated invoice lines
      for (const line of lines) {
        await client.query(
          `
                        INSERT INTO stripe_invoice_line (
                            stripe_id,
                            invoice_id,
                            stripe_customer_id,
                            product_id,
                            price_id,
                            quantity
                        )
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `,
          [line.stripeId, line.invoiceId, line.customerId, line.productId, line.priceId, line.quantity]
        );
      }

      await client.query("COMMIT");

      return this.getOneInvoice(result.rows);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getAllInvoicePaidByCompany(id: CompanyId): Promise<any[]> {
    const result = await this.pool.query(
      `
                    SELECT *
                    FROM stripe_invoice
                    WHERE stripe_customer_id IN (
                        SELECT stripe_customer_id FROM stripe_customer_user WHERE user_id IN (
                            SELECT user_id FROM user_company WHERE company_id = $1
                        )
                    ) AND paid = TRUE
                `,
      [id]
    );

    return result.rows;
  }

  async getAllInvoicePaidByUser(id: UserId): Promise<any[]> {
    const result = await this.pool.query(
      `
                    SELECT *
                    FROM stripe_invoice
                    WHERE stripe_customer_id IN (
                        SELECT stripe_customer_id FROM stripe_customer_user WHERE user_id = $1
                    ) AND paid = TRUE
                `,
      [id]
    );

    return result.rows;
  }
}
