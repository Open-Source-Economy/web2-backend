import { setupTestDB } from "../../__helpers__/jest.setup";
import { Fixture } from "../../__helpers__/Fixture";
import * as dto from "@open-source-economy/api-types";
import {
  developerProfileRepo,
  developerProjectItemRepo,
  ownerRepo,
  projectItemRepo,
  repositoryRepo,
  userRepo,
} from "../../../db";

describe("ProjectItemRepository", () => {
  setupTestDB();

  async function insertOwner() {
    const ownerId = Fixture.ownerId();
    await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));
    return ownerId;
  }

  async function insertRepository(ownerId: dto.OwnerId) {
    const repositoryId = Fixture.repositoryId(ownerId);
    await repositoryRepo.insertOrUpdate(Fixture.repository(repositoryId));
    return repositoryId;
  }

  async function createDeveloperLinkedToOwner(ownerId: dto.OwnerId) {
    const thirdPartyUser = Fixture.thirdPartyUser(
      Fixture.uuid(),
      dto.Provider.Github,
      `developer-${Fixture.uuid()}@example.com`,
    );
    const user = await userRepo.insert(Fixture.createUser(thirdPartyUser));
    const profile = await developerProfileRepo.create(
      user.id,
      thirdPartyUser.email ?? `developer-${Fixture.uuid()}@example.com`,
    );

    const ownerItem = await projectItemRepo.create({
      projectItemType: dto.ProjectItemType.GITHUB_OWNER,
      sourceIdentifier: ownerId,
    });

    await developerProjectItemRepo.create(
      profile.id,
      ownerItem.id,
      [] as dto.MergeRightsType[],
      [] as dto.DeveloperRoleType[],
      undefined,
      [],
      [] as dto.ProjectCategory[],
    );

    return { profile, ownerItem };
  }

  describe("create", () => {
    it("creates a GitHub repository project item and retrieves it by id", async () => {
      const ownerId = await insertOwner();
      const repositoryId = await insertRepository(ownerId);

      const created = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_REPOSITORY,
        sourceIdentifier: repositoryId,
      });

      expect(created.projectItemType).toBe(
        dto.ProjectItemType.GITHUB_REPOSITORY,
      );
      expect(created.sourceIdentifier).toEqual(repositoryId);

      const found = await projectItemRepo.getById(created.id);
      expect(found).toEqual(created);
    });

    it("creates a GitHub owner project item", async () => {
      const ownerId = await insertOwner();

      const created = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_OWNER,
        sourceIdentifier: ownerId,
      });

      expect(created.projectItemType).toBe(dto.ProjectItemType.GITHUB_OWNER);
      expect(created.sourceIdentifier).toEqual(ownerId);
    });

    it("creates a URL project item", async () => {
      const url = "https://docs.example.com";

      const created = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.URL,
        sourceIdentifier: url,
      });

      expect(created.projectItemType).toBe(dto.ProjectItemType.URL);
      expect(created.sourceIdentifier).toBe(url);
    });
  });

  describe("updateCategories", () => {
    it("updates categories for an existing project item", async () => {
      const ownerId = await insertOwner();
      const repositoryId = await insertRepository(ownerId);
      const created = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_REPOSITORY,
        sourceIdentifier: repositoryId,
      });

      const categories = [
        dto.ProjectCategory.Frontend,
        dto.ProjectCategory.BuildTools,
      ];

      const updated = await projectItemRepo.updateCategories(
        created.id,
        categories,
      );

      expect(updated.categories).toEqual(categories);
    });
  });

  describe("delete", () => {
    it("removes a project item", async () => {
      const ownerId = await insertOwner();
      const repositoryId = await insertRepository(ownerId);
      const created = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_REPOSITORY,
        sourceIdentifier: repositoryId,
      });

      await projectItemRepo.delete(created.id);
      const found = await projectItemRepo.getById(created.id);
      expect(found).toBeNull();
    });
  });

  describe("getByGithubRepository", () => {
    it("returns a project item for a GitHub repository", async () => {
      const ownerId = await insertOwner();
      const repositoryId = await insertRepository(ownerId);
      const created = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_REPOSITORY,
        sourceIdentifier: repositoryId,
      });

      const found = await projectItemRepo.getByGithubRepository(repositoryId);
      expect(found).toEqual(created);
    });
  });

  describe("getByGithubOwner", () => {
    it("returns project items linked to a GitHub owner", async () => {
      const ownerId = await insertOwner();
      const created = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_OWNER,
        sourceIdentifier: ownerId,
      });

      const found = await projectItemRepo.getByGithubOwner(ownerId);
      expect(found).toHaveLength(1);
      expect(found[0]).toEqual(created);
    });
  });

  describe("getByUrl", () => {
    it("returns a project item by URL", async () => {
      const url = "https://resources.example.com";
      const created = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.URL,
        sourceIdentifier: url,
      });

      const found = await projectItemRepo.getByUrl(url);
      expect(found).toEqual(created);
    });
  });

  describe("getBySourceIdentifier", () => {
    it("returns a project item by repository identifier", async () => {
      const ownerId = await insertOwner();
      const repositoryId = await insertRepository(ownerId);
      const created = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_REPOSITORY,
        sourceIdentifier: repositoryId,
      });

      const found = await projectItemRepo.getBySourceIdentifier(
        dto.ProjectItemType.GITHUB_REPOSITORY,
        repositoryId,
      );
      expect(found).toEqual(created);
    });

    it("returns a project item by owner identifier", async () => {
      const ownerId = await insertOwner();
      const created = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_OWNER,
        sourceIdentifier: ownerId,
      });

      const found = await projectItemRepo.getBySourceIdentifier(
        dto.ProjectItemType.GITHUB_OWNER,
        ownerId,
      );
      expect(found).toEqual(created);
    });

    it("returns a project item by URL", async () => {
      const url = "https://community.example.com";
      const created = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.URL,
        sourceIdentifier: url,
      });

      const found = await projectItemRepo.getBySourceIdentifier(
        dto.ProjectItemType.URL,
        url,
      );
      expect(found).toEqual(created);
    });
  });

  describe("getAll", () => {
    it("returns all project items", async () => {
      const ownerId = await insertOwner();
      const repositoryId = await insertRepository(ownerId);
      const repoItem = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_REPOSITORY,
        sourceIdentifier: repositoryId,
      });

      const ownerItem = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_OWNER,
        sourceIdentifier: ownerId,
      });

      const url = "https://blog.example.com";
      const urlItem = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.URL,
        sourceIdentifier: url,
      });

      const all = await projectItemRepo.getAll();
      expect(all).toHaveLength(3);
      expect(all).toEqual(
        expect.arrayContaining([repoItem, ownerItem, urlItem]),
      );
    });
  });

  describe("getAllWithDetails", () => {
    it("returns project items with details honoring limit and order", async () => {
      const ownerId = await insertOwner();
      const repositoryId1 = await insertRepository(ownerId);
      const first = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_REPOSITORY,
        sourceIdentifier: repositoryId1,
      });

      const repositoryId2 = await insertRepository(ownerId);
      const second = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_REPOSITORY,
        sourceIdentifier: repositoryId2,
      });

      const items = await projectItemRepo.getAllWithDetails(
        dto.ProjectItemType.GITHUB_REPOSITORY,
        {
          sortBy: dto.ProjectItemSortField.CREATED_AT,
          sortOrder: dto.SortOrder.DESC,
          limit: 1,
        },
      );

      expect(items).toHaveLength(1);
      expect(items[0].projectItem.id).toEqual(second.id);
      expect(items[0].repository).not.toBeNull();
      expect(items[0].developers).toEqual([]);

      // ensure other item not returned due to limit
      expect(items[0].projectItem.id).not.toEqual(first.id);
    });

    it("sorts repositories by forks descending", async () => {
      const ownerId = await insertOwner();

      const highForksRepoId = Fixture.repositoryId(ownerId);
      const highForksRepo = Fixture.repository(highForksRepoId);
      highForksRepo.forksCount = 250;
      await repositoryRepo.insertOrUpdate(highForksRepo);

      const lowForksRepoId = Fixture.repositoryId(ownerId);
      const lowForksRepo = Fixture.repository(lowForksRepoId);
      lowForksRepo.forksCount = 10;
      await repositoryRepo.insertOrUpdate(lowForksRepo);

      const highForksItem = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_REPOSITORY,
        sourceIdentifier: highForksRepoId,
      });
      const lowForksItem = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_REPOSITORY,
        sourceIdentifier: lowForksRepoId,
      });

      // Insert a third item with duplicate forks to test deterministic ordering.
      const midForksRepoId = Fixture.repositoryId(ownerId);
      const midForksRepo = Fixture.repository(midForksRepoId);
      midForksRepo.forksCount = 250;
      await repositoryRepo.insertOrUpdate(midForksRepo);
      const midForksItem = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_REPOSITORY,
        sourceIdentifier: midForksRepoId,
      });

      const items = await projectItemRepo.getAllWithDetails(
        dto.ProjectItemType.GITHUB_REPOSITORY,
        {
          sortBy: dto.ProjectItemSortField.FORKS,
          sortOrder: dto.SortOrder.DESC,
        },
      );

      expect(items.map((item) => item.projectItem.id)).toEqual(
        expect.arrayContaining([
          highForksItem.id,
          midForksItem.id,
          lowForksItem.id,
        ]),
      );
      const [first, second] = items;
      const firstForks = first.repository?.forksCount ?? 0;
      const secondForks = second.repository?.forksCount ?? 0;
      expect(firstForks).toBeGreaterThanOrEqual(secondForks);
    });

    it("applies owners limit when repository query is absent", async () => {
      const ownerId1 = await insertOwner();
      const ownerItem1 = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_OWNER,
        sourceIdentifier: ownerId1,
      });

      const ownerId2 = await insertOwner();
      const ownerItem2 = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_OWNER,
        sourceIdentifier: ownerId2,
      });

      const items = await projectItemRepo.getAllWithDetails(
        dto.ProjectItemType.GITHUB_OWNER,
        {
          sortBy: dto.ProjectItemSortField.CREATED_AT,
          sortOrder: dto.SortOrder.DESC,
          limit: 1,
        },
      );

      expect(items).toHaveLength(1);
      expect(items[0].projectItem.id).toEqual(ownerItem2.id);
    });

    it("applies url limit when only urls query is provided", async () => {
      const url1 = "https://resource-one.example.com";
      const item1 = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.URL,
        sourceIdentifier: url1,
      });

      const url2 = "https://resource-two.example.com";
      const item2 = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.URL,
        sourceIdentifier: url2,
      });

      const items = await projectItemRepo.getAllWithDetails(
        dto.ProjectItemType.URL,
        {
          sortBy: dto.ProjectItemSortField.CREATED_AT,
          sortOrder: dto.SortOrder.DESC,
          limit: 1,
        },
      );

      expect(items).toHaveLength(1);
      expect(items[0].projectItem.id).toEqual(item2.id);
      expect(items[0].projectItem.sourceIdentifier).toBe(url2);
    });

    it("returns only repository items when only repositories query is provided", async () => {
      const ownerId = await insertOwner();

      const repositoryId = await insertRepository(ownerId);
      const repoItem = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_REPOSITORY,
        sourceIdentifier: repositoryId,
      });

      const ownerItem = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_OWNER,
        sourceIdentifier: ownerId,
      });

      const urlItem = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.URL,
        sourceIdentifier: "https://docs.example.com",
      });

      const items = await projectItemRepo.getAllWithDetails(
        dto.ProjectItemType.GITHUB_REPOSITORY,
      );

      expect(items).toHaveLength(1);
      expect(items[0].projectItem.id).toEqual(repoItem.id);
      expect(items[0].projectItem.projectItemType).toBe(
        dto.ProjectItemType.GITHUB_REPOSITORY,
      );
      expect(
        items.find((item) => item.projectItem.id === ownerItem.id),
      ).toBeUndefined();
      expect(
        items.find((item) => item.projectItem.id === urlItem.id),
      ).toBeUndefined();
    });

    it("returns only owner items when owners query is provided", async () => {
      const ownerId = await insertOwner();

      const repositoryId = await insertRepository(ownerId);
      await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_REPOSITORY,
        sourceIdentifier: repositoryId,
      });

      const ownerItem = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_OWNER,
        sourceIdentifier: ownerId,
      });

      await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.URL,
        sourceIdentifier: "https://docs.example.com",
      });

      const items = await projectItemRepo.getAllWithDetails(
        dto.ProjectItemType.GITHUB_OWNER,
      );

      expect(items).toHaveLength(1);
      expect(items[0].projectItem.id).toEqual(ownerItem.id);
      expect(items[0].projectItem.projectItemType).toBe(
        dto.ProjectItemType.GITHUB_OWNER,
      );
    });

    it("returns only url items when urls query is provided", async () => {
      const ownerId = await insertOwner();

      const repositoryId = await insertRepository(ownerId);
      await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_REPOSITORY,
        sourceIdentifier: repositoryId,
      });

      await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_OWNER,
        sourceIdentifier: ownerId,
      });

      const urlItem = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.URL,
        sourceIdentifier: "https://docs.example.com",
      });

      const items = await projectItemRepo.getAllWithDetails(
        dto.ProjectItemType.URL,
      );

      expect(items).toHaveLength(1);
      expect(items[0].projectItem.id).toEqual(urlItem.id);
      expect(items[0].projectItem.projectItemType).toBe(
        dto.ProjectItemType.URL,
      );
    });

    it("includes developers linked to the owner when fetching repositories", async () => {
      const ownerId = await insertOwner();
      const { profile } = await createDeveloperLinkedToOwner(ownerId);

      const repositoryId = await insertRepository(ownerId);
      const repoItem = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_REPOSITORY,
        sourceIdentifier: repositoryId,
      });

      const items = await projectItemRepo.getAllWithDetails(
        dto.ProjectItemType.GITHUB_REPOSITORY,
      );

      const repoDetails = items.find(
        (item) => item.projectItem.id.uuid === repoItem.id.uuid,
      );

      expect(repoDetails).toBeDefined();
      expect(repoDetails?.developers).toHaveLength(1);
      expect(repoDetails?.developers[0].developerProfile.id.uuid).toBe(
        profile.id.uuid,
      );
    });

    it("sorts repositories by creation date ascending when requested", async () => {
      const ownerId = await insertOwner();

      const olderRepoId = await insertRepository(ownerId);
      const olderItem = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_REPOSITORY,
        sourceIdentifier: olderRepoId,
      });

      const newerRepoId = await insertRepository(ownerId);
      const newerItem = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_REPOSITORY,
        sourceIdentifier: newerRepoId,
      });

      const items = await projectItemRepo.getAllWithDetails(
        dto.ProjectItemType.GITHUB_REPOSITORY,
        {
          sortBy: dto.ProjectItemSortField.CREATED_AT,
          sortOrder: dto.SortOrder.ASC,
        },
      );

      expect(items.map((item) => item.projectItem.id)).toEqual([
        olderItem.id,
        newerItem.id,
      ]);
    });

    it("returns empty repository list when only github_repository rows exist", async () => {
      const ownerId = await insertOwner();
      await insertRepository(ownerId); // insert into github_repository

      const items = await projectItemRepo.getAllWithDetails(
        dto.ProjectItemType.GITHUB_REPOSITORY,
      );

      expect(items).toEqual([]);
    });
  });

  describe("getByIdWithDetails", () => {
    it("returns a project item with developers linked through the owner", async () => {
      const ownerId = await insertOwner();
      const { profile } = await createDeveloperLinkedToOwner(ownerId);

      const repositoryId = await insertRepository(ownerId);
      const repoItem = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_REPOSITORY,
        sourceIdentifier: repositoryId,
      });

      const details = await projectItemRepo.getByIdWithDetails(repoItem.id);

      expect(details).toBeDefined();
      expect(details?.projectItem.id.uuid).toEqual(repoItem.id.uuid);
      expect(details?.developers).toHaveLength(1);
      expect(details?.developers[0].developerProfile.id.uuid).toBe(
        profile.id.uuid,
      );
    });

    it("returns null when project item does not exist", async () => {
      const missingId = new dto.ProjectItemId(Fixture.uuid());

      const details = await projectItemRepo.getByIdWithDetails(missingId);

      expect(details).toBeNull();
    });
  });

  describe("getProjectItemsStats", () => {
    it("aggregates totals from project items", async () => {
      const ownerId = await insertOwner();
      const ownerRecord = Fixture.owner(ownerId);
      ownerRecord.followers = 42;
      await ownerRepo.insertOrUpdate(ownerRecord);

      const repositoryId = await insertRepository(ownerId);
      const repositoryRecord = Fixture.repository(repositoryId);
      repositoryRecord.stargazersCount = 123;
      repositoryRecord.forksCount = 17;
      await repositoryRepo.insertOrUpdate(repositoryRecord);

      const ownerItem = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_OWNER,
        sourceIdentifier: ownerId,
      });
      const repoItem = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_REPOSITORY,
        sourceIdentifier: repositoryId,
      });

      const maintainerUser = Fixture.thirdPartyUser(
        Fixture.uuid(),
        dto.Provider.Github,
        `maintainer-${Fixture.uuid()}@example.com`,
      );
      const user = await userRepo.insert(Fixture.createUser(maintainerUser));
      const profile = await developerProfileRepo.create(
        user.id,
        maintainerUser.email ?? `maintainer-${Fixture.uuid()}@example.com`,
      );
      await developerProjectItemRepo.create(
        profile.id,
        repoItem.id,
        [] as dto.MergeRightsType[],
        [] as dto.DeveloperRoleType[],
      );

      const stats = await projectItemRepo.getProjectItemsStats();

      expect(stats).toEqual({
        totalProjects: 2,
        totalMaintainers: 1,
        totalStars: 123,
        totalForks: 17,
        totalFollowers: 42,
      });
    });
  });

  describe("getBySlugWithDetails", () => {
    it("returns repository details by owner and repo slug including owner-linked developers", async () => {
      const ownerId = await insertOwner();
      const { profile } = await createDeveloperLinkedToOwner(ownerId);

      const repositoryId = await insertRepository(ownerId);
      const repoItem = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_REPOSITORY,
        sourceIdentifier: repositoryId,
      });

      const details = await projectItemRepo.getBySlugWithDetails(
        ownerId.login,
        repositoryId.name,
      );

      expect(details).toBeDefined();
      expect(details?.projectItem.id.uuid).toEqual(repoItem.id.uuid);
      expect(details?.developers).toHaveLength(1);
      expect(details?.developers[0].developerProfile.id.uuid).toEqual(
        profile.id.uuid,
      );
    });

    it("returns owner details when only owner slug is provided", async () => {
      const ownerId = await insertOwner();
      const ownerItem = await projectItemRepo.create({
        projectItemType: dto.ProjectItemType.GITHUB_OWNER,
        sourceIdentifier: ownerId,
      });

      const details = await projectItemRepo.getBySlugWithDetails(ownerId.login);

      expect(details).toBeDefined();
      expect(details?.projectItem.id.uuid).toEqual(ownerItem.id.uuid);
      expect(details?.projectItem.projectItemType).toBe(
        dto.ProjectItemType.GITHUB_OWNER,
      );
    });

    it("returns null when no project item matches slug", async () => {
      const details = await projectItemRepo.getBySlugWithDetails(
        "unknown-owner",
        "unknown-repo",
      );

      expect(details).toBeNull();
    });
  });
});
