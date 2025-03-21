import { Pool } from "pg";
import {
  CompanyId,
  ManualInvoice,
  ManualInvoiceId,
  UserId,
} from "../api/model";
import { pool } from "../dbPool";
import { CreateManualInvoiceBody } from "../api/dto";
import { logger } from "../config";

export function getManualInvoiceRepository(): ManualInvoiceRepository {
  return new ManualInvoiceRepositoryImpl(pool);
}

export interface ManualInvoiceRepository {
  create(manualInvoice: CreateManualInvoiceBody): Promise<ManualInvoice>;

  update(manualInvoice: ManualInvoice): Promise<ManualInvoice>;

  getById(id: ManualInvoiceId): Promise<ManualInvoice | null>;

  getAll(): Promise<ManualInvoice[]>;

  getAllInvoicePaidBy(id: CompanyId | UserId): Promise<ManualInvoice[]>;
}

class ManualInvoiceRepositoryImpl implements ManualInvoiceRepository {
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getOneManualInvoice(rows: any[]): ManualInvoice {
    const manualInvoice = this.getOptionalManualInvoice(rows);
    if (manualInvoice === null) {
      throw new Error("ManualInvoice not found");
    } else {
      return manualInvoice;
    }
  }

  private getOptionalManualInvoice(rows: any[]): ManualInvoice | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple manual invoices found");
    } else {
      const manualInvoice = ManualInvoice.fromBackend(rows[0]);
      if (manualInvoice instanceof Error) {
        throw manualInvoice;
      }
      return manualInvoice;
    }
  }

  private getManualInvoiceList(rows: any[]): ManualInvoice[] {
    return rows.map((r) => {
      const manualInvoice = ManualInvoice.fromBackend(r);
      if (manualInvoice instanceof Error) {
        throw manualInvoice;
      }
      return manualInvoice;
    });
  }

  async create(manualInvoice: CreateManualInvoiceBody): Promise<ManualInvoice> {
    const client = await this.pool.connect();

    logger.debug(`Creating manual invoice`, manualInvoice);

    try {
      const result = await client.query(
        `
                    INSERT INTO manual_invoice (number, company_id, user_id, paid, credit_amount)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *
                `,
        [
          manualInvoice.number,
          manualInvoice.companyId?.uuid,
          manualInvoice.userId?.uuid,
          manualInvoice.paid,
          manualInvoice.creditAmount,
        ],
      );

      return this.getOneManualInvoice(result.rows);
    } finally {
      client.release();
    }
  }

  async update(manualInvoice: ManualInvoice): Promise<ManualInvoice> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
                    UPDATE manual_invoice
                    SET number = $1,
                        company_id = $2,
                        user_id = $3,
                        paid = $4,
                        credit_amount = $5
                    WHERE id = $6
                    RETURNING id, number, company_id, user_id, paid, credit_amount
                `,
        [
          manualInvoice.number,
          manualInvoice.companyId?.uuid,
          manualInvoice.userId?.uuid,
          manualInvoice.paid,
          manualInvoice.creditAmount,
          manualInvoice.id?.uuid,
        ],
      );

      return this.getOneManualInvoice(result.rows);
    } finally {
      client.release();
    }
  }

  async getById(id: ManualInvoiceId): Promise<ManualInvoice | null> {
    const result = await this.pool.query(
      `
                SELECT *
                FROM manual_invoice
                WHERE id = $1
            `,
      [id.uuid],
    );

    return this.getOptionalManualInvoice(result.rows);
  }

  async getAll(): Promise<ManualInvoice[]> {
    const result = await this.pool.query(
      `
                SELECT *
                FROM manual_invoice
            `,
    );

    return this.getManualInvoiceList(result.rows);
  }

  async getAllInvoicePaidBy(id: CompanyId | UserId): Promise<ManualInvoice[]> {
    let result;

    if (id instanceof CompanyId) {
      logger.debug(`Getting all manual invoices paid by company: ${id.uuid}`);
      result = await this.pool.query(
        `
                        SELECT *
                        FROM manual_invoice
                        WHERE company_id = $1 AND paid = TRUE
                    `,
        [id.uuid],
      );
    } else {
      result = await this.pool.query(
        `
                        SELECT *
                        FROM manual_invoice
                        WHERE user_id = $1 AND paid = TRUE
                    `,
        [id.uuid],
      );
    }

    return this.getManualInvoiceList(result.rows);
  }
}
