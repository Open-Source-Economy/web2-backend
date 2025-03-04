import { Pool } from "pg";
import { Company, CompanyId } from "../api/model";
import { pool } from "../dbPool";
import { CreateCompanyBody } from "../api/dto";
import { logger } from "../config";

export function getCompanyRepository(): CompanyRepository {
  return new CompanyRepositoryImpl(pool);
}

export interface CompanyRepository {
  create(company: CreateCompanyBody): Promise<Company>;
  update(company: Company): Promise<Company>;
  getById(id: CompanyId): Promise<Company | null>;
  getAll(): Promise<Company[]>;
}

class CompanyRepositoryImpl implements CompanyRepository {
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getOneCompany(rows: any[]): Company {
    const company = this.getOptionalCompany(rows);
    if (company === null) {
      throw new Error("Company not found");
    } else {
      return company;
    }
  }

  private getOptionalCompany(rows: any[]): Company | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple company found");
    } else {
      const company = Company.fromBackend(rows[0]);
      if (company instanceof Error) {
        throw company;
      }
      return company;
    }
  }

  private getCompanyList(rows: any[]): Company[] {
    return rows.map((r) => {
      const company = Company.fromBackend(r);
      if (company instanceof Error) {
        throw company;
      }
      return company;
    });
  }

  async getAll(): Promise<Company[]> {
    const result = await this.pool.query(`
      SELECT *
      FROM company
    `);

    return this.getCompanyList(result.rows);
  }

  async getById(id: CompanyId): Promise<Company | null> {
    logger.debug(`Getting company by id:`, id);
    const result = await this.pool.query(
      `
      SELECT *
      FROM company
      WHERE id = $1
      `,
      [id.uuid],
    );

    return this.getOptionalCompany(result.rows);
  }

  // TODO: ensure taxId is not "" or variation of empty string
  async create(company: CreateCompanyBody): Promise<Company> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
      INSERT INTO company (tax_id, name, address_id)
      VALUES ($1, $2, $3) 
      RETURNING *
      `,
        [company.taxId, company.name, company.addressId?.uuid ?? null],
      );

      return this.getOneCompany(result.rows);
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  async update(company: Company): Promise<Company> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `
        UPDATE company
        SET tax_id = $1,
            name = $2,
            address_id = $3
        WHERE id = $4
        RETURNING *
        `,
        [
          company.taxId,
          company.name,
          company.addressId?.uuid ?? null,
          company.id.uuid,
        ],
      );

      return this.getOneCompany(result.rows);
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }
}
