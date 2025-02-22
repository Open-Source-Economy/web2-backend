import { setupTestDB } from "../__helpers__/jest.setup";
import { CompanyId, CompanyUserRole, IssueId, UserId } from "../../model";
import {
  companyRepo,
  creditRepo,
  issueFundingRepo,
  manualInvoiceRepo,
  userCompanyRepo,
  userRepo,
} from "../../db/";
import { Fixture } from "../__helpers__/Fixture";
import { CreateIssueFundingBody, CreateManualInvoiceBody } from "../../dtos";
import { issueRepo, ownerRepo, repositoryRepo } from "../../db";

describe("CreditRepository", () => {
  setupTestDB();
  let lonelyUserId: UserId;
  let companyUserId1: UserId;
  let companyUserId2: UserId;
  let validCompanyId: CompanyId;
  let validIssueId: IssueId;

  beforeEach(async () => {
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

    const ownerId = Fixture.ownerId();
    await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));

    const repositoryId = Fixture.repositoryId(ownerId);
    await repositoryRepo.insertOrUpdate(Fixture.repository(repositoryId));

    validIssueId = Fixture.issueId(repositoryId);
    await issueRepo.createOrUpdate(Fixture.issue(validIssueId, ownerId));
  });

  describe("getAvailableCredits", () => {
    describe("should return 0", () => {
      it("for a user with no invoices nor issue funding", async () => {
        const totalCredits = await creditRepo.getAvailableCredit(lonelyUserId);
        expect(totalCredits).toEqual(0);
      });

      it("for a company with no invoices nor issue funding", async () => {
        const totalCredits = await creditRepo.getAvailableCredit(
          companyUserId1,
          validCompanyId,
        );

        expect(totalCredits).toEqual(0);
      });
    });

    describe("should return the amount manually added", () => {
      it("for a user", async () => {
        const manualInvoiceBody: CreateManualInvoiceBody = {
          ...Fixture.createManualInvoiceBody(undefined, lonelyUserId),
          creditAmount: 200,
        };
        await manualInvoiceRepo.create(manualInvoiceBody);
        const totalCredits = await creditRepo.getAvailableCredit(lonelyUserId);
        expect(totalCredits).toEqual(200);
      });

      it("for a company", async () => {
        const manualInvoiceBody: CreateManualInvoiceBody = {
          ...Fixture.createManualInvoiceBody(validCompanyId),
          creditAmount: 200,
        };
        await manualInvoiceRepo.create(manualInvoiceBody);
        const totalCredits = await creditRepo.getAvailableCredit(
          companyUserId1,
          validCompanyId,
        );
        expect(totalCredits).toEqual(200);
      });
    });

    describe("should return the amount added with stripe", () => {
      it("for a user", async () => {
        // TODO
      });

      it("for a company", async () => {
        // TODO
      });
    });

    describe("should return the sum added with stripe and manually added", () => {
      it("for a user", async () => {
        // TODO
      });

      it("for a company", async () => {
        // TODO
      });
    });

    describe("should deduct a funding issue", () => {
      it("for a user", async () => {
        const manualInvoiceBody: CreateManualInvoiceBody = {
          ...Fixture.createManualInvoiceBody(undefined, lonelyUserId),
          creditAmount: 200,
        };
        await manualInvoiceRepo.create(manualInvoiceBody);

        const issueFundingBody1: CreateIssueFundingBody = {
          githubIssueId: validIssueId,
          userId: lonelyUserId,
          creditAmount: 50,
        };
        const issueFundingBody2: CreateIssueFundingBody = {
          ...issueFundingBody1,
          creditAmount: 20,
        };
        await issueFundingRepo.create(issueFundingBody1);
        await issueFundingRepo.create(issueFundingBody2);

        const totalCredits = await creditRepo.getAvailableCredit(lonelyUserId);
        expect(totalCredits).toEqual(200 - 50 - 20);
      });

      it("for a company", async () => {
        const manualInvoiceBody: CreateManualInvoiceBody = {
          ...Fixture.createManualInvoiceBody(validCompanyId),
          creditAmount: 200,
        };
        await manualInvoiceRepo.create(manualInvoiceBody);

        const issueFundingBody1: CreateIssueFundingBody = {
          githubIssueId: validIssueId,
          userId: companyUserId2,
          creditAmount: 50,
        };
        const issueFundingBody2: CreateIssueFundingBody = {
          ...issueFundingBody1,
          creditAmount: 20,
        };
        await issueFundingRepo.create(issueFundingBody1);
        await issueFundingRepo.create(issueFundingBody2);

        const expected = 200 - 50 - 20;
        const totalCredits1 = await creditRepo.getAvailableCredit(
          companyUserId1,
          validCompanyId,
        );
        expect(totalCredits1).toEqual(expected);
        const totalCredits2 = await creditRepo.getAvailableCredit(
          companyUserId2,
          validCompanyId,
        );
        expect(totalCredits2).toEqual(expected);
      });
    });

    // TODO: Add all the possible test cases for `getAvailableCredits`:
  });
});
