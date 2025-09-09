import { setupTestDB } from "../__helpers__/jest.setup";
import { CreateIssueFundingBody, UserId } from "@open-source-economy/api-types";
import { Fixture } from "../__helpers__/Fixture";
import {
  issueFundingRepo,
  issueRepo,
  ownerRepo,
  repositoryRepo,
  userRepo,
} from "../../db";

describe("IssueFundingRepository", () => {
  setupTestDB();
  let validUserId: UserId;

  beforeEach(async () => {
    const validUser = await userRepo.insert(
      Fixture.createUser(Fixture.localUser()),
    );
    validUserId = validUser.id;
  });

  describe("create", () => {
    it("should create a new issue funding record", async () => {
      const ownerId = Fixture.ownerId();
      await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));

      const repositoryId = Fixture.repositoryId(ownerId);
      await repositoryRepo.insertOrUpdate(Fixture.repository(repositoryId));

      const issueId = Fixture.issueId(repositoryId);
      const issue = Fixture.issue(issueId, ownerId);
      await issueRepo.createOrUpdate(issue);

      const issueFundingBody: CreateIssueFundingBody = {
        githubIssueId: issueId,
        userId: validUserId,
        creditAmount: 5000,
      };

      expect(true).toEqual(true);
      const created = await issueFundingRepo.create(issueFundingBody);

      expect(created).toEqual(
        Fixture.issueFundingFromBody(created.id, issueFundingBody),
      );

      const found = await issueFundingRepo.getById(created.id);
      expect(found).toEqual(created);
    });

    // Add more test cases for `create`:
    // - Test with invalid data (e.g., negative amount)
    // - Verify error handling and database constraints
  });

  describe("getById", () => {
    it("should return null if issue funding not found", async () => {
      const nonExistentIssueFundingId = Fixture.issueFundingId();
      const found = await issueFundingRepo.getById(nonExistentIssueFundingId);

      expect(found).toBeNull();
    });
  });

  describe("getAll", () => {
    it("should return an empty array if no issue fundings exist", async () => {
      const allIssueFundings = await issueFundingRepo.getAll();

      expect(allIssueFundings).toEqual([]);
    });

    it("should return all issue fundings", async () => {
      const ownerId = Fixture.ownerId();
      await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));

      const repositoryId = Fixture.repositoryId(ownerId);
      await repositoryRepo.insertOrUpdate(Fixture.repository(repositoryId));

      const issueId = Fixture.issueId(repositoryId);
      const issue = Fixture.issue(issueId, ownerId);
      await issueRepo.createOrUpdate(issue);

      const issueFundingBody1: CreateIssueFundingBody = {
        githubIssueId: issueId,
        userId: validUserId,
        creditAmount: 5000,
      };

      const issueFundingBody2: CreateIssueFundingBody = {
        githubIssueId: issueId,
        userId: validUserId,
        creditAmount: 10000,
      };

      const issueFunding1 = await issueFundingRepo.create(issueFundingBody1);
      const issueFunding2 = await issueFundingRepo.create(issueFundingBody2);

      const allIssueFundings = await issueFundingRepo.getAll();

      expect(allIssueFundings).toHaveLength(2);
      expect(allIssueFundings).toContainEqual(
        Fixture.issueFundingFromBody(issueFunding1.id, issueFundingBody1),
      );
      expect(allIssueFundings).toContainEqual(
        Fixture.issueFundingFromBody(issueFunding2.id, issueFundingBody2),
      );
    });
  });
});
