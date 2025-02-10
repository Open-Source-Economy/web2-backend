import { setupTestDB } from "../../__helpers__/jest.setup";
import { Fixture } from "../../__helpers__/Fixture";
import {
  Issue,
  IssueId,
  Owner,
  OwnerId,
  Repository,
  RepositoryId,
} from "../../../model";
import fs from "fs";
import { logger } from "../../../config";
import { issueRepo, ownerRepo, repositoryRepo } from "../../../db";

describe("IssueRepository", () => {
  setupTestDB();

  describe("insertOrUpdate", () => {
    describe("insert", () => {
      it("should work", async () => {
        const ownerId = Fixture.ownerId();
        await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));

        const repositoryId = Fixture.repositoryId(ownerId);
        await repositoryRepo.insertOrUpdate(Fixture.repository(repositoryId));

        const issueId = Fixture.issueId(repositoryId);
        const issue = Fixture.issue(issueId, ownerId);
        const created = await issueRepo.createOrUpdate(issue);
        expect(created).toEqual(issue);

        const found = await issueRepo.getById(issue.id);
        expect(found).toEqual(issue);
      });

      it("should fail with foreign key constraint error if repository or owner is not inserted", async () => {
        const ownerId = Fixture.ownerId();
        const repositoryId = Fixture.repositoryId(ownerId);

        const issueId = Fixture.issueId(repositoryId);
        const issue = Fixture.issue(issueId, ownerId);

        try {
          await issueRepo.createOrUpdate(issue);
          // If the insertion doesn't throw, fail the test
          fail(
            "Expected foreign key constraint violation, but no error was thrown.",
          );
        } catch (error: any) {
          // Check if the error is related to foreign key constraint
          expect(error.message).toMatch(/violates foreign key constraint/);
        }
      });

      it("should work with real GitHub data", async () => {
        const ownerData = fs.readFileSync(
          `src/__tests__/__data__/github/owner-org.json`,
          "utf8",
        );

        const repoData = fs.readFileSync(
          `src/__tests__/__data__/github/repository.json`,
          "utf8",
        );

        const issueData = fs.readFileSync(
          `src/__tests__/__data__/github/issue.json`,
          "utf8",
        );

        const owner = Owner.fromGithubApi(ownerData);
        const repository = Repository.fromGithubApi(repoData);

        if (owner instanceof Error) {
          logger.error(owner);
          fail("Owner parsing failed");
        } else if (repository instanceof Error) {
          logger.error(repository);
          fail("Repository parsing failed");
        } else {
          const issue = Issue.fromGithubApi(repository.id, issueData);
          const openBy = Owner.fromGithubApi(JSON.parse(issueData).user);
          if (issue instanceof Error) {
            logger.error(issue);
            fail(issue);
          } else if (openBy instanceof Error) {
            logger.error(openBy);
            fail(openBy);
          } else {
            await ownerRepo.insertOrUpdate(owner);
            await repositoryRepo.insertOrUpdate(repository);
            await ownerRepo.insertOrUpdate(openBy);
            const created = await issueRepo.createOrUpdate(issue);

            expect(created).toBeInstanceOf(Issue);
          }
        }
      });
    });

    describe("update", () => {
      it("should work", async () => {
        const ownerId = Fixture.ownerId();
        await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));

        const repositoryId = Fixture.repositoryId(ownerId);
        await repositoryRepo.insertOrUpdate(Fixture.repository(repositoryId));

        const issueId = Fixture.issueId(repositoryId);
        const issue = Fixture.issue(issueId, ownerId);
        await issueRepo.createOrUpdate(issue);

        const updatedIssue = Fixture.issue(issueId, ownerId, "updated-payload");
        const updated = await issueRepo.createOrUpdate(updatedIssue);
        expect(updated).toEqual(updatedIssue);

        const found = await issueRepo.getById(issue.id);
        expect(found).toEqual(updatedIssue);
      });
    });
  });

  describe("getById", () => {
    it("should return null if issue not found", async () => {
      const ownerId = Fixture.ownerId();
      const repositoryId = Fixture.repositoryId(ownerId);

      const nonExistentIssueId = Fixture.issueId(repositoryId);
      const found = await issueRepo.getById(nonExistentIssueId);

      expect(found).toBeNull();
    });

    it("succeed when github ids are not given", async () => {
      const ownerId = Fixture.ownerId();
      await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));

      const repositoryId = Fixture.repositoryId(ownerId);
      await repositoryRepo.insertOrUpdate(Fixture.repository(repositoryId));

      const issueId = Fixture.issueId(repositoryId);
      const issue = Fixture.issue(issueId, ownerId);
      await issueRepo.createOrUpdate(issue);

      const undefinedOwnerId = new OwnerId(ownerId.login, undefined);
      const undefinedRepositoryId = new RepositoryId(
        undefinedOwnerId,
        repositoryId.name,
        undefined,
      );
      const undefinedIssueId = new IssueId(
        undefinedRepositoryId,
        issueId.number,
        undefined,
      );

      const found = await issueRepo.getById(undefinedIssueId);
      expect(found).toEqual(issue);
    });
  });

  describe("getAll", () => {
    it("should return all issues", async () => {
      const ownerId = Fixture.ownerId();
      await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));

      const repositoryId = Fixture.repositoryId(ownerId);
      await repositoryRepo.insertOrUpdate(Fixture.repository(repositoryId));

      const issueId1 = Fixture.issueId(repositoryId);
      const issueId2 = Fixture.issueId(repositoryId);
      const issue1 = Fixture.issue(issueId1, ownerId);
      const issue2 = Fixture.issue(issueId2, ownerId);

      await issueRepo.createOrUpdate(issue1);
      await issueRepo.createOrUpdate(issue2);

      const allIssues = await issueRepo.getAll();

      expect(allIssues).toHaveLength(2);
      expect(allIssues).toContainEqual(issue1);
      expect(allIssues).toContainEqual(issue2);
    });

    it("should return an empty array if no issues exist", async () => {
      const allIssues = await issueRepo.getAll();
      expect(allIssues).toEqual([]);
    });
  });
});
