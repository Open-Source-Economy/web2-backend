/**
 * Local replacement for the removed Validator and ValidationError from api-types.
 * These classes provide a simple way to extract and validate fields from raw DB row objects.
 */

export class ValidationError extends Error {
  public data: any;

  constructor(message: string, data?: any) {
    super(message);
    this.name = "ValidationError";
    this.data = data;
  }
}

export class Validator {
  private errors: ValidationError[] = [];
  private data: any;

  constructor(data: any) {
    this.data = data;
  }

  getFirstError(): ValidationError | null {
    return this.errors.length > 0 ? this.errors[0] : null;
  }

  requiredString(key: string): string {
    const value = this.data[key];
    if (value === undefined || value === null) {
      this.errors.push(new ValidationError(`Missing required string field: ${key}`, this.data));
      return "" as any;
    }
    return String(value);
  }

  optionalString(key: string): string | undefined {
    const value = this.data[key];
    if (value === undefined || value === null) {
      return undefined;
    }
    return String(value);
  }

  requiredNumber(key: string): number {
    const value = this.data[key];
    if (value === undefined || value === null) {
      this.errors.push(new ValidationError(`Missing required number field: ${key}`, this.data));
      return 0 as any;
    }
    const num = Number(value);
    if (isNaN(num)) {
      this.errors.push(new ValidationError(`Field ${key} is not a valid number`, this.data));
      return 0 as any;
    }
    return num;
  }

  optionalNumber(key: string): number | undefined {
    const value = this.data[key];
    if (value === undefined || value === null) {
      return undefined;
    }
    const num = Number(value);
    if (isNaN(num)) {
      return undefined;
    }
    return num;
  }

  optionalDecimal(key: string): number | undefined {
    const value = this.data[key];
    if (value === undefined || value === null) {
      return undefined;
    }
    const num = parseFloat(String(value));
    if (isNaN(num)) {
      return undefined;
    }
    return num;
  }

  requiredBoolean(key: string): boolean {
    const value = this.data[key];
    if (value === undefined || value === null) {
      this.errors.push(new ValidationError(`Missing required boolean field: ${key}`, this.data));
      return false as any;
    }
    return Boolean(value);
  }

  optionalBoolean(key: string): boolean | undefined {
    const value = this.data[key];
    if (value === undefined || value === null) {
      return undefined;
    }
    return Boolean(value);
  }

  requiredEnum<T>(key: string, validValues: T[]): T {
    const value = this.data[key];
    if (value === undefined || value === null) {
      this.errors.push(new ValidationError(`Missing required enum field: ${key}`, this.data));
      return undefined as any;
    }
    if (!validValues.includes(value as T)) {
      this.errors.push(new ValidationError(`Invalid enum value for field ${key}: ${value}`, this.data));
      return undefined as any;
    }
    return value as T;
  }

  optionalEnum<T>(key: string, validValues: T[]): T | undefined {
    const value = this.data[key];
    if (value === undefined || value === null) {
      return undefined;
    }
    if (!validValues.includes(value as T)) {
      return undefined;
    }
    return value as T;
  }

  requiredDate(key: string): any {
    const value = this.data[key];
    if (value === undefined || value === null) {
      this.errors.push(new ValidationError(`Missing required date field: ${key}`, this.data));
      return undefined as any;
    }
    if (value instanceof Date) {
      return value.toISOString() as any;
    }
    return String(value) as any;
  }

  optionalDate(key: string): any | undefined {
    const value = this.data[key];
    if (value === undefined || value === null) {
      return undefined;
    }
    if (value instanceof Date) {
      return value.toISOString() as any;
    }
    return String(value) as any;
  }

  requiredArrayOfEnums<T>(key: string, validValues: T[]): T[] {
    const value = this.data[key];
    if (value === undefined || value === null || !Array.isArray(value)) {
      this.errors.push(new ValidationError(`Missing required array of enums field: ${key}`, this.data));
      return [] as any;
    }
    return value.filter((v: any) => validValues.includes(v as T)) as T[];
  }

  optionalArrayOfEnums<T>(key: string, validValues: T[]): T[] | undefined {
    const value = this.data[key];
    if (value === undefined || value === null) {
      return undefined;
    }
    if (!Array.isArray(value)) {
      return undefined;
    }
    return value.filter((v: any) => validValues.includes(v as T)) as T[];
  }

  optionalArray<T = any>(key: string, _type?: string): T[] | undefined {
    const value = this.data[key];
    if (value === undefined || value === null) {
      return undefined;
    }
    if (!Array.isArray(value)) {
      return undefined;
    }
    return value as T[];
  }

  optionalObject(key: string): any | undefined {
    const value = this.data[key];
    if (value === undefined || value === null) {
      return undefined;
    }
    return value;
  }
}
