import { CompanyId, UserId } from "../model";

export interface CreateCustomerDto {
  userId: UserId;
  email?: string;
  companyId?: CompanyId;
}
