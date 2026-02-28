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
  GithubData,
  ISODateTimeString,
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
  Project,
  Provider,
  Repository,
  RepositoryId,
  RepositoryUserPermissionToken,
  RepositoryUserPermissionTokenId,
  RepositoryUserRole,
  RequestIssueFundingBody,
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
  UserId,
  UserRepository,
  UserRole,
} from "@open-source-economy/api-types";
import { v4 as uuid } from "uuid";
import Decimal from "decimal.js";
import { CreateUser } from "../../db";
import { BackendLocalUser } from "../../db/helpers/companions/user/backend-user.types";
import { CreateRepositoryUserPermissionTokenDto } from "../../db/user/RepositoryUserPermissionToken.repository";

// Locally defined body types that were removed from api-types

interface CreateAddressBody {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface CreateCompanyBody {
  name: string;
  taxId?: string;
  addressId?: AddressId;
}

interface CreateCompanyUserPermissionTokenBody {
  userName: string;
  userEmail: string;
  token: string;
  companyId: CompanyId;
  companyUserRole: CompanyUserRole;
  expiresAt: Date;
}

interface CreateManualInvoiceBody {
  number: number;
  companyId?: CompanyId;
  userId?: UserId;
  paid: boolean;
  creditAmount: number;
}

interface CreateManagedIssueBody {
  githubIssueId: IssueId;
  requestedCreditAmount: number | null;
  managerId: UserId;
  contributorVisibility: ContributorVisibility;
  state: ManagedIssueState;
}

export const Fixture = {
  id(): number {
    return Math.floor(Math.random() * 1000000);
  },
  uuid(): string {
    return uuid();
  },

  userId(): UserId {
    const id = this.uuid();
    return id as UserId;
  },

  localUser(): BackendLocalUser {
    return {
      email: "d@gmail.com" + this.uuid(),
      isEmailVerified: false,
      password: "testPassword123!",
    } as BackendLocalUser;
  },
  thirdPartyUser(
    id: string,
    provider: Provider = Provider.Github,
    email: string = "lauriane@gmail.com",
  ): ThirdPartyUser {
    return {
      provider,
      email,
      providerData: {
        owner: Fixture.owner(Fixture.ownerId()),
      } as GithubData,
    } as ThirdPartyUser;
  },
  createUser(data: BackendLocalUser | ThirdPartyUser): CreateUser {
    return {
      name: null,
      data: data,
      role: UserRole.USER,
      termsAcceptedVersion: "1.0.0",
    };
  },

  ownerId(): OwnerId {
    const id = this.id();
    return { login: `owner-${id}`, githubId: id } as OwnerId;
  },

  owner(ownerId: OwnerId, payload: string = "payload"): Owner {
    return {
      id: ownerId,
      type: OwnerType.Organization,
      htmlUrl: "url",
      avatarUrl: payload,
    } as Owner;
  },

  repositoryId(ownerId: OwnerId): RepositoryId {
    const id = this.id();
    return { ownerId, name: `repo-${id}`, githubId: id } as RepositoryId;
  },

  repository(
    repositoryId: RepositoryId,
    payload: string = "payload",
  ): Repository {
    return {
      id: repositoryId,
      htmlUrl: "https://example.com",
      description: payload,
    } as Repository;
  },

  issueId(repositoryId: RepositoryId): IssueId {
    const number = this.id();
    return { repositoryId, number, githubId: number } as IssueId;
  },

  issue(issueId: IssueId, openByOwnerId: OwnerId, payload = "payload"): Issue {
    return {
      id: issueId,
      title: "issue title",
      htmlUrl: "url",
      createdAt: "2022-01-01T00:00:00.000Z" as ISODateTimeString,
      closedAt: null,
      openBy: openByOwnerId,
      body: payload,
    } as Issue;
  },
  addressId(): AddressId {
    const id = this.uuid();
    return id as AddressId;
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
    return { id: addressId } as Address;
  },
  addressFromBody(addressId: AddressId, dto: CreateAddressBody): Address {
    return {
      id: addressId,
      name: dto.name,
      line1: dto.line1,
      line2: dto.line2,
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode,
      country: dto.country,
    } as Address;
  },

  companyId(): CompanyId {
    const id = this.uuid();
    return id as CompanyId;
  },

  createCompanyBody(addressId?: AddressId): CreateCompanyBody {
    return {
      name: "company",
      taxId: "taxId" + this.uuid(),
      addressId: addressId,
    };
  },
  company(companyId: CompanyId, addressId: AddressId | null = null): Company {
    return {
      id: companyId,
      taxId: null,
      name: "Company",
      addressId: addressId,
    } as Company;
  },
  companyFromBody(companyId: CompanyId, dto: CreateCompanyBody): Company {
    return {
      id: companyId,
      taxId: dto.taxId ?? null,
      name: dto.name ?? null,
      addressId: dto.addressId ?? null,
    } as Company;
  },

  stripeProductId(): StripeProductId {
    const id = this.uuid();
    return id as StripeProductId;
  },

  stripeProduct(
    productId: StripeProductId,
    projectId: string | null,
    productType: ProductType = ProductType.CREDIT,
  ): StripeProduct {
    return {
      stripeId: productId,
      projectId,
      type: productType,
    } as StripeProduct;
  },

  stripePriceId(): StripePriceId {
    const id = this.uuid();
    return id as StripePriceId;
  },

  stripePrice(
    stripeId: StripePriceId,
    productId: StripeProductId,
    unitAmount: number = 200,
    currency: Currency = Currency.USD,
    priceType: PriceType = PriceType.MONTHLY,
  ): StripePrice {
    return {
      stripeId,
      productId,
      unitAmount,
      currency,
      active: true,
      type: priceType,
    } as StripePrice;
  },

  stripeCustomerId(): StripeCustomerId {
    const id = this.uuid();
    return id as StripeCustomerId;
  },

  stripeCustomer(
    stripeId: StripeCustomerId,
    currency: Currency = Currency.USD,
    email: string = "default@example.com",
    name: string = "Default Name",
    phone?: string,
    preferredLocales: string[] = [],
  ): StripeCustomer {
    return {
      stripeId,
      currency,
      email,
      name,
    } as StripeCustomer;
  },

  stripeInvoiceId(): StripeInvoiceId {
    const id = this.uuid();
    return id as StripeInvoiceId;
  },

  stripeInvoice(
    invoiceId: StripeInvoiceId,
    customerId: StripeCustomerId,
    lines: StripeInvoiceLine[],
    currency: Currency = Currency.USD,
    total: number = 1000,
    invoiceNumber: string | null = "123",
  ): StripeInvoice {
    return {
      stripeId: invoiceId,
      customerId,
      paid: true,
      accountCountry: "US",
      currency,
      total,
      totalExclTax: 900,
      subtotal: 800,
      subtotalExclTax: 700,
      hostedInvoiceUrl: "https://hosted_invoice_url.com",
      invoicePdf: "https://invoice_pdf.com",
      number: invoiceNumber,
    } as StripeInvoice;
  },

  stripeInvoiceLineId(): StripeInvoiceLineId {
    const id = this.uuid();
    return id as StripeInvoiceLineId;
  },
  stripeInvoiceLine(
    stripeId: StripeInvoiceLineId,
    invoiceId: StripeInvoiceId,
    customerId: StripeCustomerId,
    productId: StripeProductId,
    priceId: StripePriceId,
    quantity: number = 100,
  ): StripeInvoiceLine {
    return {
      stripeId,
      invoiceId,
      customerId,
      productId,
      priceId,
      quantity,
    } as StripeInvoiceLine;
  },

  manualInvoiceId(): ManualInvoiceId {
    const id = this.uuid();
    return id as ManualInvoiceId;
  },

  createManualInvoiceBody(
    companyId?: CompanyId,
    userId?: UserId,
    paid: boolean = true,
    creditAmount: number = 100.0,
  ): CreateManualInvoiceBody {
    return {
      number: 1,
      companyId: companyId,
      userId: userId,
      paid: paid,
      creditAmount: creditAmount,
    };
  },
  manualInvoiceFromBody(
    id: ManualInvoiceId,
    dto: CreateManualInvoiceBody,
  ): ManualInvoice {
    return {
      id,
      number: dto.number,
      companyId: dto.companyId,
      userId: dto.userId,
      paid: dto.paid,
      creditAmount: dto.creditAmount,
    } as ManualInvoice;
  },

  issueFundingId(): IssueFundingId {
    const id = this.uuid();
    return id as IssueFundingId;
  },

  issueFundingFromBody(
    issueFundingId: IssueFundingId,
    dto: RequestIssueFundingBody,
  ): IssueFunding {
    return {
      id: issueFundingId,
      githubIssueId: {} as IssueId,
      userId: "" as UserId,
      credit: dto.creditAmount ?? 0,
    } as IssueFunding;
  },
  managedIssueId(): ManagedIssueId {
    const id = this.uuid();
    return id as ManagedIssueId;
  },
  createManagedIssueBody(
    githubIssueId: IssueId,
    managerId: UserId,
    requestedCreditAmount: number = 5000,
  ): CreateManagedIssueBody {
    return {
      githubIssueId,
      requestedCreditAmount: requestedCreditAmount,
      managerId,
      contributorVisibility: ContributorVisibility.PUBLIC,
      state: ManagedIssueState.OPEN,
    };
  },
  managedIssueFromBody(
    managedIssueId: ManagedIssueId,
    dto: CreateManagedIssueBody,
  ): ManagedIssue {
    return {
      id: managedIssueId,
      githubIssueId: dto.githubIssueId,
      requestedCreditAmount: dto.requestedCreditAmount,
      managerId: dto.managerId,
      contributorVisibility: dto.contributorVisibility,
      state: dto.state,
    } as ManagedIssue;
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
    return {
      id: tokenId,
      userName: dto.userName,
      userEmail: dto.userEmail,
      token: dto.token,
      companyId: dto.companyId,
      companyUserRole: dto.companyUserRole,
      expiresAt: dto.expiresAt.toISOString() as ISODateTimeString,
      hasBeenUsed: false,
    } as CompanyUserPermissionToken;
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
      rate: new Decimal(1.0),
      currency: Currency.USD,
      expiresAt,
    };
  },

  repositoryUserPermissionTokenFromBody(
    tokenId: RepositoryUserPermissionTokenId,
    dto: CreateRepositoryUserPermissionTokenDto,
  ): RepositoryUserPermissionToken {
    return {
      id: tokenId,
      userName: dto.userName,
      userEmail: dto.userEmail,
      userGithubOwnerLogin: dto.userGithubOwnerLogin,
      token: dto.token,
      repositoryId: dto.repositoryId,
      repositoryUserRole: dto.repositoryUserRole,
      rate: dto.rate ? dto.rate.toNumber() : null,
      currency: dto.currency,
      expiresAt: dto.expiresAt.toISOString() as ISODateTimeString,
      hasBeenUsed: false,
    } as RepositoryUserPermissionToken;
  },

  userRepository(
    userId: UserId,
    repositoryId: RepositoryId,
    repositoryUserRole: RepositoryUserRole = RepositoryUserRole.READ,
    rate: number = 1.0,
    currency: Currency = Currency.USD,
  ): UserRepository {
    return {
      userId,
      repositoryId,
      repositoryUserRole,
      rate,
      currency,
    } as UserRepository;
  },

  project(projectId: OwnerId | RepositoryId): Project {
    let owner: Owner;
    let repository: Repository | undefined = undefined;
    if ("name" in projectId && "ownerId" in projectId) {
      // It's a RepositoryId
      owner = this.owner(projectId.ownerId);
      repository = this.repository(projectId);
    } else {
      // It's an OwnerId
      owner = this.owner(projectId as OwnerId);
    }

    return {
      owner,
      repository,
    } as Project;
  },
};
