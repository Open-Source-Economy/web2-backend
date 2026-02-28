import { CompanyId, ManualInvoice, ManualInvoiceId, UserId } from "@open-source-economy/api-types";
import { ValidationError, Validator } from "./Validator";

export namespace ManualInvoiceCompanion {
  export function fromBackend(row: any, table_prefix: string = ""): ManualInvoice | ValidationError {
    const validator = new Validator(row);
    const id = validator.requiredString(`${table_prefix}id`);
    const number = validator.requiredNumber(`${table_prefix}number`);
    const companyId = validator.optionalString(`${table_prefix}company_id`);
    const userId = validator.optionalString(`${table_prefix}user_id`);
    const paid = validator.requiredBoolean(`${table_prefix}paid`);
    const creditAmount = validator.requiredNumber(`${table_prefix}credit_amount`);

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return {
      id: id as ManualInvoiceId,
      number,
      companyId: companyId ? (companyId as CompanyId) : undefined,
      userId: userId ? (userId as UserId) : undefined,
      paid,
      creditAmount,
    } as ManualInvoice;
  }
}
