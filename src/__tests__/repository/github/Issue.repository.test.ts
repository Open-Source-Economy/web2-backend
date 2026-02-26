import { setupTestDB } from "../../__helpers__/jest.setup";
import { Fixture } from "../../__helpers__/Fixture";
import {
  Issue,
  ISODateTimeString,
  IssueId,
  Owner,
  OwnerId,
  OwnerType,
  Repository,
  RepositoryId,
} from "@open-source-economy/api-types";
import fs from "fs";
import { logger } from "../../../config";
import { issueRepo, ownerRepo, repositoryRepo } from "../../../db";

// Local parsing helpers (replace the old static fromGithubApi methods)
function parseOwnerFromGithubApi(json: any): Owner {
  if (!json || !json.login) {
    throw new Error(`Invalid GitHub owner data: missing login field`);
  }
  return {
    id: { login: json.login, githubId: json.id } as OwnerId,
    type:
      json.type === "Organization" ? OwnerType.Organization : OwnerType.User,
    htmlUrl: json.html_url,
    avatarUrl: json.avatar_url,
    followers: json.followers,
    following: json.following,
    publicRepos: json.public_repos,
    publicGists: json.public_gists,
    name: json.name,
    twitterUsername: json.twitter_username,
    company: json.company,
    blog: json.website_url ?? json.blog,
    location: json.location,
    email: json.email,
  } as Owner;
}

function parseRepositoryFromGithubApi(json: any): Repository {
  if (!json || !json.name || !json.owner) {
    throw new Error(`Invalid GitHub repository data: missing required fields`);
  }
  const ownerId: OwnerId = { login: json.owner.login, githubId: json.owner.id };
  return {
    id: { ownerId, name: json.name, githubId: json.id } as RepositoryId,
    htmlUrl: json.html_url,
    description: json.description,
  } as Repository;
}

function parseIssueFromGithubApi(repositoryId: RepositoryId, json: any): Issue {
  if (!json || json.number == null) {
    throw new Error(`Invalid GitHub issue data: missing required fields`);
  }
  return {
    id: { repositoryId, number: json.number, githubId: json.id } as IssueId,
    title: json.title,
    htmlUrl: json.html_url,
    createdAt: json.created_at as ISODateTimeString,
    closedAt: json.closed_at ? (json.closed_at as ISODateTimeString) : null,
    openBy: { login: json.user?.login, githubId: json.user?.id } as OwnerId,
    body: json.body,
  } as Issue;
}

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

        const ownerJson = JSON.parse(ownerData);
        const repoJson = JSON.parse(repoData);
        const issueJson = JSON.parse(issueData);

        const owner = parseOwnerFromGithubApi(ownerJson);
        const repository = parseRepositoryFromGithubApi(repoJson);
        const issue = parseIssueFromGithubApi(repository.id, issueJson);
        const openBy = parseOwnerFromGithubApi(issueJson.user);

        await ownerRepo.insertOrUpdate(owner);
        await repositoryRepo.insertOrUpdate(repository);
        await ownerRepo.insertOrUpdate(openBy);
        const created = await issueRepo.createOrUpdate(issue);

        expect(created).toBeDefined();
        expect(created.id).toBeDefined();
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

      const undefinedOwnerId: OwnerId = {
        login: ownerId.login,
        githubId: undefined,
      };
      const undefinedRepositoryId: RepositoryId = {
        ownerId: undefinedOwnerId,
        name: repositoryId.name,
        githubId: undefined,
      };
      const undefinedIssueId: IssueId = {
        repositoryId: undefinedRepositoryId,
        number: issueId.number,
        githubId: undefined,
      };

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
