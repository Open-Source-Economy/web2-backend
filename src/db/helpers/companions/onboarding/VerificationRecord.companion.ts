import {
  UserId,
  ValidationError,
  Validator,
  VerificationEntityType,
  VerificationRecord,
  VerificationRecordId,
  VerificationStatus,
} from "@open-source-economy/api-types";

export namespace VerificationRecordCompanion {
  export function fromBackend(
    row: any,
    table_prefix: string = "",
  ): VerificationRecord | ValidationError {
    const validator = new Validator(row);
    const id = validator.requiredString(`${table_prefix}id`);
    const entityType = validator.requiredString(`${table_prefix}entity_type`);
    const entityId = validator.requiredString(`${table_prefix}entity_id`);
    const status = validator.requiredString(`${table_prefix}status`);
    const notes = validator.optionalString(`${table_prefix}notes`);
    const verifiedBy = validator.optionalString(`${table_prefix}verified_by`);
    const createdAt = validator.requiredDate(`${table_prefix}created_at`);
    const developerResponse = validator.optionalString(
      `${table_prefix}developer_response`,
    );
    const developerRespondedAt = validator.optionalDate(
      `${table_prefix}developer_responded_at`,
    );

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return {
      id: new VerificationRecordId(id),
      entityType: entityType as VerificationEntityType,
      entityId,
      status: status as VerificationStatus,
      notes,
      verifiedBy: verifiedBy ? new UserId(verifiedBy) : undefined,
      createdAt,
      developerResponse,
      developerRespondedAt,
    };
  }
}
