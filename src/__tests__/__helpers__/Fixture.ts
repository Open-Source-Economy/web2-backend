import {
  Address,
  AddressId,
  Company,
  CompanyId,
  CompanyUserPermissionToken,
  CompanyUserPermissionTokenId,
  CompanyUserRole,
  ContributorVisibility,
  Currency,
  DowCurrency,
  GithubData,
  Issue,
  IssueFunding,
  IssueFundingId,
  IssueId,
  LocalUser,
  ManagedIssue,
  ManagedIssueId,
  ManagedIssueState,
  ManualInvoice,
  ManualInvoiceId,
  Owner,
  OwnerId,
  OwnerType,
  PriceType,
  ProductType,
  ProjectId,
  Provider,
  Repository,
  RepositoryId,
  RepositoryUserPermissionToken,
  RepositoryUserPermissionTokenId,
  RepositoryUserRole,
  StripeCustomer,
  StripeCustomerId,
  StripeInvoice,
  StripeInvoiceId,
  StripeInvoiceLine,
  StripeInvoiceLineId,
  StripePrice,
  StripePriceId,
  StripeProduct,
  StripeProductId,
  ThirdPartyUser,
  ThirdPartyUserId,
  UserId,
  UserRepository,
  UserRole,
} from "../../model";
import {
  CreateAddressBody,
  CreateCompanyBody,
  CreateCompanyUserPermissionTokenBody,
  CreateIssueFundingBody,
  CreateManagedIssueBody,
  CreateManualInvoiceBody,
} from "../../dtos";
import { v4 as uuid } from "uuid";
import Decimal from "decimal.js";
import { CreateRepositoryUserPermissionTokenDto, CreateUser } from "../../db";

export const Fixture = {
  id(): number {
    return Math.floor(Math.random() * 1000000);
  },
  uuid(): string {
    return uuid();
  },

  userId(): UserId {
    const id = this.uuid();
    return new UserId(id);
  },

  localUser(): LocalUser {
    return new LocalUser("d@gmail.com" + this.uuid(), false, "password");
  },
  thirdPartyUser(
    id: string,
    provider: Provider = Provider.Github,
    email: string = "lauriane@gmail.com",
  ): ThirdPartyUser {
    return new ThirdPartyUser(
      provider,
      new ThirdPartyUserId(id),
      email,
      new GithubData(Fixture.owner(Fixture.ownerId())),
    );
  },
  createUser(data: LocalUser | ThirdPartyUser): CreateUser {
    return {
      name: null,
      data: data,
      role: UserRole.USER,
    };
  },

  ownerId(): OwnerId {
    const id = this.id();
    return new OwnerId(`owner-${id.toString()}`, id);
  },

  owner(ownerId: OwnerId, payload: string = "payload"): Owner {
    return new Owner(ownerId, OwnerType.Organization, "url", payload);
  },

  repositoryId(ownerId: OwnerId): RepositoryId {
    const id = this.id();
    return new RepositoryId(ownerId, `repo-${id}`, id);
  },

  repository(
    repositoryId: RepositoryId,
    payload: string = "payload",
  ): Repository {
    return new Repository(repositoryId, "https://example.com", payload);
  },

  issueId(repositoryId: RepositoryId): IssueId {
    const number = this.id();
    return new IssueId(repositoryId, number, number);
  },

  issue(issueId: IssueId, openByOwnerId: OwnerId, payload = "payload"): Issue {
    return new Issue(
      issueId,
      "issue title",
      "url",
      new Date("2022-01-01T00:00:00.000Z"),
      null,
      openByOwnerId,
      payload,
    );
  },
  addressId(): AddressId {
    const uuid = this.uuid();
    return new AddressId(uuid);
  },
  createAddressBody(): CreateAddressBody {
    return {
      name: "Valid Address",
      line1: "123 Test St",
      city: "Test City",
      state: "Test State",
      postalCode: "12345",
      country: "Test Country",
    } as CreateAddressBody;
  },
  address(addressId: AddressId): Address {
    return new Address(addressId);
  },
  addressFromBody(addressId: AddressId, dto: CreateAddressBody): Address {
    return new Address(
      addressId,
      dto.name,
      dto.line1,
      dto.line2,
      dto.city,
      dto.state,
      dto.postalCode,
      dto.country,
    );
  },

  companyId(): CompanyId {
    const uuid = this.uuid();
    return new CompanyId(uuid);
  },

  createCompanyBody(addressId?: AddressId): CreateCompanyBody {
    return {
      name: "company",
      taxId: "taxId" + this.uuid(),
      addressId: addressId ?? null,
    };
  },
  company(companyId: CompanyId, addressId: AddressId | null = null): Company {
    return new Company(
      companyId,
      null,
      "Company",
      addressId !== null ? addressId : null,
    );
  },
  companyFromBody(companyId: CompanyId, dto: CreateCompanyBody): Company {
    return new Company(
      companyId,
      dto.taxId ?? null,
      dto.name ?? null,
      dto.addressId ?? null,
    );
  },

  stripeProductId(): StripeProductId {
    const uuid = this.uuid();
    return new StripeProductId(uuid);
  },

  stripeProduct(
    productId: StripeProductId,
    projectId: ProjectId | null,
    productType: ProductType = ProductType.milliDow,
  ): StripeProduct {
    return new StripeProduct(productId, projectId, productType);
  },

  stripePriceId(): StripePriceId {
    const uuid = this.uuid();
    return new StripePriceId(uuid);
  },

  stripePrice(
    stripeId: StripePriceId,
    productId: StripeProductId,
    unitAmount: number = 200,
    currency: Currency = Currency.USD,
    priceType: PriceType = PriceType.RECURRING,
  ): StripePrice {
    return new StripePrice(
      stripeId,
      productId,
      unitAmount,
      currency,
      true,
      priceType,
    );
  },

  stripeCustomerId(): StripeCustomerId {
    const uuid = this.uuid();
    return new StripeCustomerId(uuid);
  },

  stripeCustomer(
    stripeId: StripeCustomerId,
    currency: string = "USD",
    email: string = "default@example.com",
    name: string = "Default Name",
    phone?: string,
    preferredLocales: string[] = [],
  ): StripeCustomer {
    return new StripeCustomer(
      stripeId,
      currency,
      email,
      name,
      phone,
      preferredLocales,
    );
  },

  stripeInvoiceId(): StripeInvoiceId {
    const uuid = this.uuid();
    return new StripeInvoiceId(uuid);
  },

  stripeInvoice(
    invoiceId: StripeInvoiceId,
    customerId: StripeCustomerId,
    lines: StripeInvoiceLine[],
    currency: Currency = Currency.USD,
    total: number = 1000,
    invoiceNumber: string | null = "123",
  ): StripeInvoice {
    return new StripeInvoice(
      invoiceId,
      customerId,
      true,
      "US",
      lines,
      currency,
      total,
      900,
      800,
      700,
      "https://hosted_invoice_url.com",
      "https://invoice_pdf.com",
      invoiceNumber,
    );
  },

  stripeInvoiceLineId(): StripeInvoiceLineId {
    const uuid = this.uuid();
    return new StripeInvoiceLineId(uuid);
  },
  stripeInvoiceLine(
    stripeId: StripeInvoiceLineId,
    invoiceId: StripeInvoiceId,
    customerId: StripeCustomerId,
    productId: StripeProductId,
    priceId: StripePriceId,
  ): StripeInvoiceLine {
    return new StripeInvoiceLine(
      stripeId,
      invoiceId,
      customerId,
      productId,
      priceId,
      100,
    );
  },

  manualInvoiceId(): ManualInvoiceId {
    const uuid = this.uuid();
    return new ManualInvoiceId(uuid);
  },

  createManualInvoiceBody(
    companyId?: CompanyId,
    userId?: UserId,
    paid: boolean = true,
    dowAmount: number = 100.0,
  ): CreateManualInvoiceBody {
    return {
      number: 1,
      companyId: companyId,
      userId: userId,
      paid: paid,
      milliDowAmount: dowAmount,
    };
  },
  manualInvoiceFromBody(
    id: ManualInvoiceId,
    dto: CreateManualInvoiceBody,
  ): ManualInvoice {
    return new ManualInvoice(
      id,
      dto.number,
      dto.companyId,
      dto.userId,
      dto.paid,
      dto.milliDowAmount,
    );
  },

  issueFundingId(): IssueFundingId {
    const uuid = this.uuid();
    return new IssueFundingId(uuid);
  },

  issueFundingFromBody(
    issueFundingId: IssueFundingId,
    dto: CreateIssueFundingBody,
  ): IssueFunding {
    return new IssueFunding(
      issueFundingId,
      dto.githubIssueId,
      dto.userId,
      dto.milliDowAmount,
    );
  },
  managedIssueId(): ManagedIssueId {
    const uuid = this.uuid();
    return new ManagedIssueId(uuid);
  },
  createManagedIssueBody(
    githubIssueId: IssueId,
    managerId: UserId,
    requestedDowAmount: number = 5000,
  ): CreateManagedIssueBody {
    return {
      githubIssueId,
      requestedMilliDowAmount: requestedDowAmount,
      managerId,
      contributorVisibility: ContributorVisibility.PUBLIC,
      state: ManagedIssueState.OPEN,
    };
  },
  managedIssueFromBody(
    managedIssueId: ManagedIssueId,
    dto: CreateManagedIssueBody,
  ): ManagedIssue {
    return new ManagedIssue(
      managedIssueId,
      dto.githubIssueId,
      dto.requestedMilliDowAmount,
      dto.managerId,
      dto.contributorVisibility,
      dto.state,
    );
  },

  createUserCompanyPermissionTokenBody(
    userEmail: string,
    companyId: CompanyId,
    expiresAt: Date = new Date(Date.now() + 1000 * 60 * 60 * 24), // Default to 1 day in the future
  ): CreateCompanyUserPermissionTokenBody {
    return {
      userName: "lauriane",
      userEmail,
      token: `token-${Math.floor(Math.random() * 1000000)}`,
      companyId,
      companyUserRole: CompanyUserRole.READ,
      expiresAt,
    };
  },

  userCompanyPermissionTokenFromBody(
    tokenId: CompanyUserPermissionTokenId,
    dto: CreateCompanyUserPermissionTokenBody,
  ): CompanyUserPermissionToken {
    return new CompanyUserPermissionToken(
      tokenId,
      dto.userName,
      dto.userEmail,
      dto.token,
      dto.companyId,
      dto.companyUserRole,
      dto.expiresAt,
      false,
    );
  },

  createRepositoryUserPermissionTokenBody(
    repositoryId: RepositoryId,
    userGithubOwnerLogin: string = `lauriane ${Fixture.uuid()}`,
    expiresAt: Date = new Date(Date.now() + 1000 * 60 * 60 * 24), // Default to 1 day in the future
  ): CreateRepositoryUserPermissionTokenDto {
    return {
      userName: "lauriane",
      userEmail: "lauriane@gmail.com",
      userGithubOwnerLogin,
      token: `token-${Math.floor(Math.random() * 1000000)}`,
      repositoryId,
      repositoryUserRole: RepositoryUserRole.READ,
      dowRate: new Decimal(1.0),
      dowCurrency: DowCurrency.USD,
      expiresAt,
    };
  },

  repositoryUserPermissionTokenFromBody(
    tokenId: RepositoryUserPermissionTokenId,
    dto: CreateRepositoryUserPermissionTokenDto,
  ): RepositoryUserPermissionToken {
    return new RepositoryUserPermissionToken(
      tokenId,
      dto.userName,
      dto.userEmail,
      dto.userGithubOwnerLogin,
      dto.token,
      dto.repositoryId,
      dto.repositoryUserRole,
      dto.dowRate,
      dto.dowCurrency,
      dto.expiresAt,
      false,
    );
  },

  userRepository(
    userId: UserId,
    repositoryId: RepositoryId,
    repositoryUserRole: RepositoryUserRole = RepositoryUserRole.READ,
    dowRate: number = 1.0,
    dowCurrency: string = "USD",
  ): UserRepository {
    return new UserRepository(
      userId,
      repositoryId,
      repositoryUserRole,
      new Decimal(dowRate),
      dowCurrency,
    );
  },
};
