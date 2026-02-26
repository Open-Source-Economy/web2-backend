import { Pool } from "pg";
import {
  CompanyId,
  ManualInvoice,
  ManualInvoiceId,
  UserId,
} from "@open-source-economy/api-types";
import { pool } from "../dbPool";
import { logger } from "../config";
import { ManualInvoiceCompanion } from "./helpers/companions";

export interface CreateManualInvoiceBody {
  number: number;
  companyId?: CompanyId;
  userId?: UserId;
  paid: boolean;
  creditAmount: number;
}

export function getManualInvoiceRepository(): ManualInvoiceRepository {
  return new ManualInvoiceRepositoryImpl(pool);
}

export interface ManualInvoiceRepository {
  create(manualInvoice: CreateManualInvoiceBody): Promise<ManualInvoice>;

  update(manualInvoice: ManualInvoice): Promise<ManualInvoice>;

  getById(id: ManualInvoiceId): Promise<ManualInvoice | null>;

  getAll(): Promise<ManualInvoice[]>;

  getAllInvoicePaidByCompany(id: CompanyId): Promise<ManualInvoice[]>;

  getAllInvoicePaidByUser(id: UserId): Promise<ManualInvoice[]>;
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
      const manualInvoice = ManualInvoiceCompanion.fromBackend(rows[0]);
      if (manualInvoice instanceof Error) {
        throw manualInvoice;
      }
      return manualInvoice;
    }
  }

  private getManualInvoiceList(rows: any[]): ManualInvoice[] {
    return rows.map((r) => {
      const manualInvoice = ManualInvoiceCompanion.fromBackend(r);
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
          manualInvoice.companyId ?? null,
          manualInvoice.userId ?? null,
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
          manualInvoice.companyId ?? null,
          manualInvoice.userId ?? null,
          manualInvoice.paid,
          manualInvoice.creditAmount,
          manualInvoice.id,
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
      [id],
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

  async getAllInvoicePaidByCompany(id: CompanyId): Promise<ManualInvoice[]> {
    logger.debug(`Getting all manual invoices paid by company: ${id}`);
    const result = await this.pool.query(
      `
                        SELECT *
                        FROM manual_invoice
                        WHERE company_id = $1 AND paid = TRUE
                    `,
      [id],
    );

    return this.getManualInvoiceList(result.rows);
  }

  async getAllInvoicePaidByUser(id: UserId): Promise<ManualInvoice[]> {
    const result = await this.pool.query(
      `
                        SELECT *
                        FROM manual_invoice
                        WHERE user_id = $1 AND paid = TRUE
                    `,
      [id],
    );

    return this.getManualInvoiceList(result.rows);
  }
}
