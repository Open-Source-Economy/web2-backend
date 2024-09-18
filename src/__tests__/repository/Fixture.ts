import {
  Company,
  Address,
  AddressId,
  CompanyId,
  Email,
  GithubData,
  Issue,
  IssueId,
  Owner,
  OwnerId,
  OwnerType,
  Provider,
  Repository,
  RepositoryId,
  StripeCustomerId,
  StripeInvoice,
  StripeInvoiceId,
  StripeInvoiceLine,
  StripeInvoiceLineId,
  StripeProduct,
  StripeProductId,
  ThirdPartyUser,
  ThirdPartyUserId,
} from "../../model";
import { CreateAddressDto } from "../../dtos/CreateAddressDto";
import { CreateCompanyDto, CreateLocalUserDto } from "../../dtos";

export const Fixture = {
  id(): number {
    return Math.floor(Math.random() * 1000000);
  },
  thirdPartyUser(
    id: string,
    provider: Provider = Provider.Github,
    email: string = "lauriane@gmail.com",
  ): ThirdPartyUser {
    return new ThirdPartyUser(
      provider,
      new ThirdPartyUserId(id),
      [new Email(email, null)],
      new GithubData(Fixture.owner(1)),
    );
  },
  createUserDto(): CreateLocalUserDto {
    return {
      email: "d@gmail.com" + this.id(),
      password: "password",
    } as CreateLocalUserDto;
  },

  owner(ownerId: number, payload: string = "payload"): Owner {
    return new Owner(
      new OwnerId(ownerId),
      OwnerType.Organization,
      "Open Source Economy",
      "url",
      payload,
    );
  },
  repository(
    repositoryId: number,
    ownerId: number,
    payload: string = "payload",
  ): Repository {
    return new Repository(
      new RepositoryId(repositoryId),
      new OwnerId(ownerId),
      "Repository Name",
      "https://example.com",
      payload,
    );
  },
  issue(
    issueId: number,
    numberId: number,
    repositoryId: number,
    openByOwnerId: number,
  ): Issue {
    return new Issue(
      new IssueId(issueId, numberId),
      new RepositoryId(repositoryId),
      "issue title",
      "url",
      new Date("2022-01-01T00:00:00.000Z"),
      null,
      new OwnerId(openByOwnerId),
      "body",
    );
  },
  address(addressId: number): Address {
    return new Address(new AddressId(addressId));
  },
  addressFromDto(addressId: number, dto: CreateAddressDto): Address {
    return new Address(
      new AddressId(addressId),
      dto.name ?? undefined,
      dto.line1 ?? undefined,
      dto.line2 ?? undefined,
      dto.city ?? undefined,
      dto.state ?? undefined,
      dto.postalCode ?? undefined,
      dto.country ?? undefined,
    );
  },
  company(
    companyId: number,
    contactPersonId: number | null = null,
    addressId: number | null = null,
  ): Company {
    return new Company(
      new CompanyId(companyId),
      null,
      null,
      contactPersonId !== null ? new OwnerId(contactPersonId) : null,
      addressId !== null ? new AddressId(addressId) : null,
    );
  },
  companyFromDto(companyId: number, dto: CreateCompanyDto): Company {
    return new Company(
      new CompanyId(companyId),
      dto.taxId ?? null,
      dto.name ?? null,
      dto.contactPersonId ?? null,
      dto.addressId ?? null,
    );
  },

  stripeProduct(productId: string): StripeProduct {
    return new StripeProduct(new StripeProductId(productId), "DoW", 1);
  },

  stripeInvoice(
    invoiceId: string,
    customerId: string,
    lines: StripeInvoiceLine[],
  ): StripeInvoice {
    return new StripeInvoice(
      new StripeInvoiceId(invoiceId),
      new StripeCustomerId(customerId),
      true,
      "US",
      lines,
      "USD",
      1000,
      900,
      800,
      700,
      "https://hosted_invoice_url.com",
      "https://invoice_pdf.com",
    );
  },
  stripeInvoiceLine(
    stripeId: string,
    invoiceId: string,
    customerId: string,
    productId: string,
  ): StripeInvoiceLine {
    return new StripeInvoiceLine(
      new StripeInvoiceLineId(stripeId),
      new StripeInvoiceId(invoiceId),
      new StripeCustomerId(customerId),
      new StripeProductId(productId),
      "100",
      100,
    );
  },
};
