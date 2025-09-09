import { Pool } from "pg";
import { BackendCompanion } from "./companions/BackendCompanion";

export abstract class BaseRepository<T> {
  protected pool: Pool;
  protected companion: BackendCompanion<T>;

  constructor(pool: Pool, companion: BackendCompanion<T>) {
    this.pool = pool;
    this.companion = companion;
  }

  protected getOne(rows: any[]): T {
    const result = this.getOptional(rows);
    if (result === null) {
      throw new Error("Result not found");
    }
    return result;
  }

  protected getOptional(rows: any[]): T | null {
    if (rows.length === 0) {
      return null;
    } else if (rows.length > 1) {
      throw new Error("Multiple results found");
    } else {
      const data = this.companion.fromBackend(rows[0]);
      if (data instanceof Error) {
        throw data;
      }
      return data;
    }
  }

  protected getList(rows: any[]): T[] {
    return rows.map((row) => {
      const data = this.companion.fromBackend(row);
      if (data instanceof Error) {
        throw data;
      }
      return data;
    });
  }
}
