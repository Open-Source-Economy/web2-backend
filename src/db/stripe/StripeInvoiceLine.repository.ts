import { Pool } from "pg";
import {
  StripeInvoiceId,
  StripeInvoiceLine,
  StripeInvoiceLineId,
} from "../../model";
import { pool } from "../../dbPool";

export function getStripeInvoiceLineRepository(): StripeInvoiceLineRepository {
  return new StripeInvoiceLineRepositoryImpl(pool);
}

export interface StripeInvoiceLineRepository {
  insert(invoiceLine: StripeInvoiceLine): Promise<StripeInvoiceLine>;
  getById(id: StripeInvoiceLineId): Promise<StripeInvoiceLine | null>;
  getByInvoiceId(id: StripeInvoiceId): Promise<StripeInvoiceLine[]>;
  getAll(): Promise<StripeInvoiceLine[]>;
}

class StripeInvoiceLineRepositoryImpl implements StripeInvoiceLineRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getOneInvoiceLine(rows: any[]): StripeInvoiceLine {
    const invoiceLine = this.getOptionalInvoiceLine(rows);
    if (invoiceLine === null) {
      throw new Error("Invoice line not found");
    } else {
      return invoiceLine;
    }
  }

  private getOptionalInvoiceLine(rows: any[]): StripeInvoiceLine | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple invoice lines found");
    } else {
      const invoiceLine = StripeInvoiceLine.fromBackend(rows[0]);
      if (invoiceLine instanceof Error) {
        throw invoiceLine;
      }
      return invoiceLine;
    }
  }

  private getInvoiceLineList(rows: any[]): StripeInvoiceLine[] {
    return rows.map((r) => {
      const invoiceLine = StripeInvoiceLine.fromBackend(r);
      if (invoiceLine instanceof Error) {
        throw invoiceLine;
      }
      return invoiceLine;
    });
  }

  async getAll(): Promise<StripeInvoiceLine[]> {
    const result = await this.pool.query(`
            SELECT stripe_id, invoice_id, stripe_customer_id, product_id, price_id, quantity
            FROM stripe_invoice_line
        `);

    return this.getInvoiceLineList(result.rows);
  }

  async getById(id: StripeInvoiceLineId): Promise<StripeInvoiceLine | null> {
    const result = await this.pool.query(
      `
            SELECT stripe_id, invoice_id, stripe_customer_id, product_id, price_id, quantity
            FROM stripe_invoice_line
            WHERE stripe_id = $1
        `,
      [id.toString()],
    );

    return this.getOptionalInvoiceLine(result.rows);
  }

  async getByInvoiceId(id: StripeInvoiceId): Promise<StripeInvoiceLine[]> {
    const result = await this.pool.query(
      `
            SELECT stripe_id, invoice_id, stripe_customer_id, product_id, price_id, quantity
            FROM stripe_invoice_line
            WHERE invoice_id = $1
        `,
      [id.toString()],
    );

    return this.getInvoiceLineList(result.rows);
  }

  async insert(invoiceLine: StripeInvoiceLine): Promise<StripeInvoiceLine> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
                INSERT INTO stripe_invoice_line (
                    stripe_id, invoice_id, stripe_customer_id, product_id, price_id, quantity
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING stripe_id, invoice_id, stripe_customer_id, product_id, price_id, quantity
            `,
        [
          invoiceLine.stripeId.toString(),
          invoiceLine.invoiceId.toString(),
          invoiceLine.customerId.toString(),
          invoiceLine.productId.toString(),
          invoiceLine.priceId.toString(),
          invoiceLine.quantity,
        ],
      );

      return this.getOneInvoiceLine(result.rows);
    } finally {
      client.release();
    }
  }
}
