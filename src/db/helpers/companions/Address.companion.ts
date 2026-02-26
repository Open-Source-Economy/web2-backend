import { Address, AddressId } from "@open-source-economy/api-types";
import { ValidationError, Validator } from "./Validator";

export namespace AddressCompanion {
  export function fromBackend(
    row: any,
    table_prefix: string = "",
  ): Address | ValidationError {
    const validator = new Validator(row);
    const id = validator.requiredString(`${table_prefix}id`);
    const name = validator.optionalString(`${table_prefix}name`);
    const line1 = validator.optionalString(`${table_prefix}line_1`);
    const line2 = validator.optionalString(`${table_prefix}line_2`);
    const city = validator.optionalString(`${table_prefix}city`);
    const state = validator.optionalString(`${table_prefix}state`);
    const postalCode = validator.optionalString(`${table_prefix}postal_code`);
    const country = validator.optionalString(`${table_prefix}country`);

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return {
      id: id as AddressId,
      name,
      line1,
      line2,
      city,
      state,
      postalCode,
      country,
    } as Address;
  }
}
