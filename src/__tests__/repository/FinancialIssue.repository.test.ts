import { setupTestDB } from "../__helpers__/jest.setup";
import {
  FinancialIssue,
  Issue,
  IssueId,
  Owner,
  OwnerId,
  Repository,
  RepositoryId,
  User,
  UserId,
} from "../../model";

import { CreateIssueFundingBody } from "../../dtos";
import { Fixture } from "../__helpers__/Fixture";
import { getFinancialIssueRepository } from "../../db/FinancialIssue.repository";
import { GitHubApi } from "../../services";
import {
  issueFundingRepo,
  issueRepo,
  managedIssueRepo,
  ownerRepo,
  repositoryRepo,
  userRepo,
} from "../../db";

describe("FinancialIssueRepository", () => {
  setupTestDB();

  class GitHubApiMock implements GitHubApi {
    owner: Owner;
    repository: Repository;
    issue: Issue;

    constructor(owner: Owner, repository: Repository, issue: Issue) {
      this.owner = owner;
      this.repository = repository;
      this.issue = issue;
    }

    async getOwner(ownerId: OwnerId): Promise<Owner> {
      return this.owner;
    }

    async getOwnerAndRepository(
      repositoryId: RepositoryId,
    ): Promise<[Owner, Repository]> {
      return [this.owner, this.repository];
    }

    async getIssue(issueId: IssueId): Promise<[Issue, Owner]> {
      return [this.issue, this.owner];
    }
  }

  let user: User;
  let userId: UserId;

  const ownerId1: OwnerId = Fixture.ownerId();
  const repositoryId1: RepositoryId = Fixture.repositoryId(ownerId1);
  const issueId1: IssueId = Fixture.issueId(repositoryId1);
  const owner1: Owner = Fixture.owner(ownerId1);
  const repository1: Repository = Fixture.repository(repositoryId1);
  const issue1: Issue = Fixture.issue(issueId1, ownerId1);

  const ownerId2: OwnerId = Fixture.ownerId();
  const repositoryId2: RepositoryId = Fixture.repositoryId(ownerId2);
  const issueId2: IssueId = Fixture.issueId(repositoryId2);
  const owner2: Owner = Fixture.owner(ownerId2);
  const repository2: Repository = Fixture.repository(repositoryId2);
  const issue2: Issue = Fixture.issue(issueId2, ownerId2);

  beforeEach(async () => {
    user = await userRepo.insert(Fixture.createUser(Fixture.localUser()));
    userId = user.id;
  });

  describe("get", () => {
    it("should return a financial issue, even if the DB is empty", async () => {
      const financialIssueRepo = getFinancialIssueRepository(
        new GitHubApiMock(owner1, repository1, issue1),
      );

      const financialIssue = await financialIssueRepo.get(issueId1);

      const expected = new FinancialIssue(
        owner1,
        repository1,
        issue1,
        null,
        null,
        [],
      );
      expect(financialIssue).toEqual(expected);

      /* GitHub's data was inserted in the DB*/

      await new Promise((resolve) => setTimeout(resolve, 1000)); // wait 1 second to be sure that the data is inserted in the DB (async on financialIssueRepo.get)

      const owner = await ownerRepo.getById(ownerId1);
      expect(owner).toEqual(owner1);

      const repo = await repositoryRepo.getById(repositoryId1);
      expect(repo).toEqual(repository1);

      const issue = await issueRepo.getById(issueId1);
      expect(issue).toEqual(issue1);
    });
  });

  describe("getAll", () => {
    it("One managedIssue issueFunding are defined for an issue", async () => {
      const financialIssueRepo = getFinancialIssueRepository(
        new GitHubApiMock(owner1, repository1, issue1),
      );

      await ownerRepo.insertOrUpdate(owner1);
      await repositoryRepo.insertOrUpdate(repository1);
      await issueRepo.createOrUpdate(issue1);

      /* Inserting issue fundings */
      const issueFundingBody1: CreateIssueFundingBody = {
        githubIssueId: issueId1,
        userId: userId,
        milliDowAmount: 5000,
      };

      const issueFundingBody2: CreateIssueFundingBody = {
        githubIssueId: issueId1,
        userId: userId,
        milliDowAmount: 10000,
      };

      const issueFunding1 = await issueFundingRepo.create(issueFundingBody1);
      const issueFunding2 = await issueFundingRepo.create(issueFundingBody2);

      /* Inserting managed issues */
      const managedIssueBody = Fixture.createManagedIssueBody(issueId1, userId);
      const managedIssue = await managedIssueRepo.create(managedIssueBody);

      const financialIssuea = await financialIssueRepo.getAll();

      const expected = new FinancialIssue(
        owner1,
        repository1,
        issue1,
        user,
        managedIssue,
        [issueFunding1, issueFunding2],
      );

      expect(financialIssuea).toHaveLength(1);
      expect(financialIssuea).toContainEqual(expected);
    });

    it("One managedIssue is defined for an issue and 2 issueFunding are defined for an other issue", async () => {
      const financialIssueRepo = getFinancialIssueRepository(
        new GitHubApiMock(owner1, repository1, issue1),
      );

      await ownerRepo.insertOrUpdate(owner1);
      await repositoryRepo.insertOrUpdate(repository1);
      await issueRepo.createOrUpdate(issue1);

      await ownerRepo.insertOrUpdate(owner2);
      await repositoryRepo.insertOrUpdate(repository2);
      await issueRepo.createOrUpdate(issue2);

      /* Inserting issue fundings */
      const issueFundingBody1: CreateIssueFundingBody = {
        githubIssueId: issueId1,
        userId: userId,
        milliDowAmount: 5000,
      };

      const issueFundingBody2: CreateIssueFundingBody = {
        githubIssueId: issueId1,
        userId: userId,
        milliDowAmount: 10000,
      };

      const issueFunding1 = await issueFundingRepo.create(issueFundingBody1);
      const issueFunding2 = await issueFundingRepo.create(issueFundingBody2);

      /* Inserting managed issues */
      const managedIssueBody = Fixture.createManagedIssueBody(issueId2, userId);
      const managedIssue = await managedIssueRepo.create(managedIssueBody);

      const financialIssuea = await financialIssueRepo.getAll();

      const expected1 = new FinancialIssue(
        owner1,
        repository1,
        issue1,
        null,
        null,
        [issueFunding1, issueFunding2],
      );
      const expected2 = new FinancialIssue(
        owner2,
        repository2,
        issue2,
        user,
        managedIssue,
        [],
      );

      expect(financialIssuea).toHaveLength(2);
      expect(financialIssuea).toContainEqual(expected1);
      expect(financialIssuea).toContainEqual(expected2);
    });
  });
});
