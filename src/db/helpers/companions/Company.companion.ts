import { AddressId, Company, CompanyId } from "@open-source-economy/api-types";
import { ValidationError, Validator } from "./Validator";

export namespace CompanyCompanion {
  export function fromBackend(
    row: any,
    table_prefix: string = "",
  ): Company | ValidationError {
    const validator = new Validator(row);
    const id = validator.requiredString(`${table_prefix}id`);
    const taxId = validator.optionalString(`${table_prefix}tax_id`);
    const name = validator.requiredString(`${table_prefix}name`);
    const addressId = validator.optionalString(`${table_prefix}address_id`);

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return {
      id: id as CompanyId,
      taxId: taxId ?? null,
      name,
      addressId: addressId ? (addressId as AddressId) : null,
    } as Company;
  }
}
