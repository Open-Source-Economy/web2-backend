import { Pool } from "pg";
import { Address, AddressId, CompanyId, UserId } from "../model";
import { pool } from "../dbPool";
import { CreateAddressBody } from "../dtos";

export function getAddressRepository(): AddressRepository {
  return new AddressRepositoryImpl(pool);
}

export interface AddressRepository {
  create(address: CreateAddressBody): Promise<Address>;
  update(address: Address): Promise<Address>;
  getById(id: AddressId): Promise<Address | null>;
  getByCompanyId(id: CompanyId): Promise<Address | null>;
  getCompanyUserAddress(id: UserId): Promise<Address | null>;
  getAll(): Promise<Address[]>;
}

class AddressRepositoryImpl implements AddressRepository {
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private getOneAddress(rows: any[]): Address {
    const address = this.getOptionalAddress(rows);
    if (address === null) {
      throw new Error("Address not found");
    } else {
      return address;
    }
  }

  private getOptionalAddress(rows: any[]): Address | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple company address found");
    } else {
      const address = Address.fromBackend(rows[0]);
      if (address instanceof Error) {
        throw address;
      }
      return address;
    }
  }

  private getAddressList(rows: any[]): Address[] {
    return rows.map((r) => {
      const address = Address.fromBackend(r);
      if (address instanceof Error) {
        throw address;
      }
      return address;
    });
  }

  async getByCompanyId(id: CompanyId): Promise<Address | null> {
    const result = await this.pool.query(
      `
      SELECT a.*
      FROM address a
      JOIN company c ON a.id = c.address_id
      WHERE c.id = $1
      `,
      [id.toString()],
    );

    return this.getOptionalAddress(result.rows);
  }

  async getCompanyUserAddress(id: UserId): Promise<Address | null> {
    const result = await this.pool.query(
      `
      SELECT a.*
      FROM user_company uc
      JOIN company c ON uc.company_id = c.id
      JOIN address a ON c.address_id = a.id
      WHERE uc.user_id = $1
      `,
      [id.toString()],
    );

    return this.getOptionalAddress(result.rows);
  }

  async getAll(): Promise<Address[]> {
    const result = await this.pool.query(`
      SELECT *
      FROM address
    `);

    return this.getAddressList(result.rows);
  }

  async getById(id: AddressId): Promise<Address | null> {
    const result = await this.pool.query(
      `
      SELECT *
      FROM address
      WHERE id = $1
      `,
      [id.uuid],
    );

    return this.getOptionalAddress(result.rows);
  }

  async create(address: CreateAddressBody): Promise<Address> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
                    INSERT INTO address (name, line_1, line_2, city,
                                                        state, postal_code, country)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING id, name, line_1, line_2, city, state, postal_code, country
                `,
        [
          address.name ?? null,
          address.line1 ?? null,
          address.line2 ?? null,
          address.city ?? null,
          address.state ?? null,
          address.postalCode ?? null,
          address.country ?? null,
        ],
      );

      return this.getOneAddress(result.rows);
    } finally {
      client.release();
    }
  }

  async update(address: Address): Promise<Address> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
                UPDATE address
                SET
                    name = $1,
                    line_1 = $2,
                    line_2 = $3,
                    city = $4,
                    state = $5,
                    postal_code = $6,
                    country = $7
                WHERE id = $8
                RETURNING id, name, line_1, line_2, city, state, postal_code, country
            `,
        [
          address.name,
          address.line1,
          address.line2,
          address.city,
          address.state,
          address.postalCode,
          address.country,
          address.id.uuid,
        ],
      );

      return this.getOneAddress(result.rows);
    } finally {
      client.release();
    }
  }
}
