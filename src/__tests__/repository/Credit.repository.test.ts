import { setupTestDB } from "../__helpers__/jest.setup";
import {
  CompanyId,
  CompanyUserRole,
  OwnerId,
  ProductType,
  RepositoryId,
  StripeCustomerId,
  StripeCustomerUser,
  UserId,
} from "../../model";
import {
  companyRepo,
  issueFundingRepo,
  manualInvoiceRepo,
  planAndCreditsRepo,
  stripeCustomerRepo,
  stripeCustomerUserRepo,
  stripeInvoiceRepo,
  stripePriceRepo,
  stripeProductRepo,
  userCompanyRepo,
  userRepo,
} from "../../db/";
import { Fixture } from "../__helpers__/Fixture";
import { CreateIssueFundingBody, CreateManualInvoiceBody } from "../../dtos";
import { issueRepo, ownerRepo, repositoryRepo } from "../../db";

describe("CreditRepository", () => {
  setupTestDB();

  // users and companies
  let lonelyUserId: UserId;
  let companyUserId1: UserId;
  let companyUserId2: UserId;
  let validCompanyId: CompanyId;

  // github
  const ownerId = Fixture.ownerId();
  const repositoryId = Fixture.repositoryId(ownerId);
  const validIssueId = Fixture.issueId(repositoryId);

  // stripe
  const lonelyUserStripeCustomerId: StripeCustomerId =
    Fixture.stripeCustomerId();
  const companyUserStripeCustomerId1: StripeCustomerId =
    Fixture.stripeCustomerId();
  const companyUserStripeCustomerId2: StripeCustomerId =
    Fixture.stripeCustomerId();

  const validStripeProductId = Fixture.stripeProductId();
  const validStripePriceId = Fixture.stripePriceId();
  const validStripeInvoiceId = Fixture.stripeInvoiceId();
  const stripeInvoiceLineId = Fixture.stripeInvoiceLineId();

  // testing helpers
  type TestedUser = {
    stripeCustomerId: StripeCustomerId;
    userId: UserId;
    companyId?: CompanyId | undefined;
  };
  let testUser: TestedUser;
  let testCompanyUsers: TestedUser;

  /**
   * Creates a manual invoice with the specified credit amount
   */
  async function createManualInvoice(
    testedUser: TestedUser,
    creditAmount: number,
  ): Promise<void> {
    const manualInvoiceBody: CreateManualInvoiceBody = {
      ...Fixture.createManualInvoiceBody(
        testedUser.companyId,
        testedUser.companyId ? undefined : testedUser.userId,
      ),
      creditAmount,
    };
    await manualInvoiceRepo.create(manualInvoiceBody);
  }

  /**
   * Creates a stripe invoice with the specified product type and quantity
   */
  async function createStripeInvoice(
    testedUser: TestedUser,
    projectId: OwnerId | RepositoryId | null,
    productType: ProductType,
    priceQuantity: number,
  ): Promise<void> {
    const product = Fixture.stripeProduct(
      validStripeProductId,
      projectId,
      productType,
    );
    await stripeProductRepo.insert(product);

    const price = Fixture.stripePrice(validStripePriceId, validStripeProductId);
    await stripePriceRepo.insert(price);

    const lines = [
      Fixture.stripeInvoiceLine(
        stripeInvoiceLineId,
        validStripeInvoiceId,
        testedUser.stripeCustomerId,
        validStripeProductId,
        validStripePriceId,
        priceQuantity,
      ),
    ];

    const invoice = Fixture.stripeInvoice(
      validStripeInvoiceId,
      testedUser.stripeCustomerId,
      lines,
    );

    await stripeInvoiceRepo.insert(invoice);
  }

  beforeEach(async () => {
    // users and companies
    const lonelyUser = await userRepo.insert(
      Fixture.createUser(Fixture.localUser()),
    );
    lonelyUserId = lonelyUser.id;

    const validCompany = await companyRepo.create(Fixture.createCompanyBody());
    validCompanyId = validCompany.id;

    const companyUser1 = await userRepo.insert(
      Fixture.createUser(Fixture.localUser()),
    );
    companyUserId1 = companyUser1.id;
    await userCompanyRepo.insert(
      companyUserId1,
      validCompanyId,
      CompanyUserRole.ADMIN,
    );

    const companyUser2 = await userRepo.insert(
      Fixture.createUser(Fixture.localUser()),
    );
    companyUserId2 = companyUser2.id;
    await userCompanyRepo.insert(
      companyUserId2,
      validCompanyId,
      CompanyUserRole.ADMIN,
    );

    // github
    await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));
    await repositoryRepo.insertOrUpdate(Fixture.repository(repositoryId));
    await issueRepo.createOrUpdate(Fixture.issue(validIssueId, ownerId));

    // stripe
    await stripeCustomerRepo.insert(
      Fixture.stripeCustomer(lonelyUserStripeCustomerId),
    );
    await stripeCustomerRepo.insert(
      Fixture.stripeCustomer(companyUserStripeCustomerId1),
    );
    await stripeCustomerRepo.insert(
      Fixture.stripeCustomer(companyUserStripeCustomerId2),
    );

    await stripeCustomerUserRepo.insert(
      new StripeCustomerUser(lonelyUserStripeCustomerId, lonelyUserId),
    );

    await stripeCustomerUserRepo.insert(
      new StripeCustomerUser(companyUserStripeCustomerId1, companyUserId1),
    );
    await stripeCustomerUserRepo.insert(
      new StripeCustomerUser(companyUserStripeCustomerId2, companyUserId2),
    );

    testUser = {
      stripeCustomerId: lonelyUserStripeCustomerId,
      userId: lonelyUserId,
      companyId: undefined,
    };

    testCompanyUsers = {
      stripeCustomerId: companyUserStripeCustomerId1,
      userId: companyUserId1,
      companyId: validCompanyId,
    };
  });

  const expected = async (
    testedUser: TestedUser,
    expectedCreditAmount: number,
  ) => {
    if (testedUser.companyId) {
      const totalCredits = await planAndCreditsRepo.getAvailableCredit(
        companyUserId1,
        validCompanyId,
      );
      expect(totalCredits).toEqual(expectedCreditAmount);

      const totalCredits2 = await planAndCreditsRepo.getAvailableCredit(
        companyUserId2,
        validCompanyId,
      );
      expect(totalCredits2).toEqual(expectedCreditAmount);
    } else {
      const totalCredits =
        await planAndCreditsRepo.getAvailableCredit(lonelyUserId);
      expect(totalCredits).toEqual(expectedCreditAmount);
    }
  };

  describe("getAvailableCredits", () => {
    describe("should return 0 when no invoices", () => {
      const test = async (testedUser: TestedUser) => {
        await expected(testedUser, 0);
      };
      it("for lonely user", async () => {
        await test(testUser);
      });
      it("for company", async () => {
        await test(testCompanyUsers);
      });
    });

    describe("should return the amount manually added", () => {
      const test = async (testedUser: TestedUser) => {
        await createManualInvoice(testedUser, 100);
        await expected(testedUser, 100);
      };
      it("for lonely user", async () => {
        await test(testUser);
      });
      it("for company", async () => {
        await test(testCompanyUsers);
      });
    });

    describe("should not count donations", () => {
      [ownerId, repositoryId, null].map((projectId) => {
        const test = async (testedUser: TestedUser) => {
          await createStripeInvoice(
            testedUser,
            projectId,
            ProductType.DONATION,
            200,
          );
          await expected(testedUser, 0);
        };
        describe(`project id set to ${projectId instanceof RepositoryId ? "Repository" : projectId instanceof OwnerId ? "Owner" : "null"}`, () => {
          it("for lonely user", async () => {
            await test(testUser);
          });
          it("for company", async () => {
            await test(testCompanyUsers);
          });
        });
      });
    });

    describe("should return the amount added with stripe", () => {
      [ownerId, repositoryId, null].map((projectId) => {
        const test = async (testedUser: TestedUser) => {
          await createStripeInvoice(
            testedUser,
            projectId,
            ProductType.CREDIT,
            200,
          );
          await expected(testedUser, 200);
        };
        describe(`project id set to ${projectId instanceof RepositoryId ? "Repository" : projectId instanceof OwnerId ? "Owner" : "null"}`, () => {
          it("for lonely user", async () => {
            await test(testUser);
          });
          it("for company", async () => {
            await test(testCompanyUsers);
          });
        });
      });
    });

    describe("should deduct a funding issue", () => {
      [ownerId, repositoryId, null].map((projectId) => {
        const test = async (testedUser: TestedUser) => {
          // Add credits via manual and stripe invoices
          await createManualInvoice(testedUser, 100);
          await createStripeInvoice(
            testedUser,
            projectId,
            ProductType.CREDIT,
            200,
          );

          // issue funding
          const issueFundingBody1: CreateIssueFundingBody = {
            githubIssueId: validIssueId,
            userId: testedUser.userId,
            creditAmount: 20,
          };
          const issueFundingBody2: CreateIssueFundingBody = {
            githubIssueId: validIssueId,
            userId: testedUser.userId,
            creditAmount: 50,
          };
          await issueFundingRepo.create(issueFundingBody1);
          await issueFundingRepo.create(issueFundingBody2);

          // test if all company user funding are counting
          if (testedUser.companyId) {
            const issueFundingBody3: CreateIssueFundingBody = {
              githubIssueId: validIssueId,
              userId: companyUserId2,
              creditAmount: 10,
            };
            await issueFundingRepo.create(issueFundingBody3);
          }

          const totalCredits = await planAndCreditsRepo.getAvailableCredit(
            testedUser.userId,
            testedUser.companyId,
          );
          expect(totalCredits).toEqual(
            200 + 100 - 50 - 20 - (testedUser.companyId ? 10 : 0),
          );
        };

        describe(`project id set to ${projectId instanceof RepositoryId ? "Repository" : projectId instanceof OwnerId ? "Owner" : "null"}`, () => {
          it("for lonely user", async () => {
            await test(testUser);
          });
          it("for company", async () => {
            await test(testCompanyUsers);
          });
        });
      });
    });

    describe("should not deduct issue that was rejected", () => {
      //   TODO: Implement this test
    });
  });
});
