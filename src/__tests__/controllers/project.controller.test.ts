import request from "supertest";
import { StatusCodes } from "http-status-codes";
import * as dto from "@open-source-economy/api-types";

import { createApp } from "../../createApp";
import { setupTestDB } from "../__helpers__/jest.setup";
import { Fixture } from "../__helpers__/Fixture";
import {
  developerProfileRepo,
  developerProjectItemRepo,
  ownerRepo,
  projectItemRepo,
  repositoryRepo,
  userRepo,
} from "../../db";

describe("ProjectController.getProjectDetails", () => {
  const app = createApp();
  setupTestDB();

  async function seedRepositoryProject() {
    const ownerId = Fixture.ownerId();
    await ownerRepo.insertOrUpdate(Fixture.owner(ownerId));

    const ownerItem = await projectItemRepo.create({
      projectItemType: dto.ProjectItemType.GITHUB_OWNER,
      sourceIdentifier: ownerId,
    });

    const repositoryId = Fixture.repositoryId(ownerId);
    await repositoryRepo.insertOrUpdate(Fixture.repository(repositoryId));

    const repositoryItem = await projectItemRepo.create({
      projectItemType: dto.ProjectItemType.GITHUB_REPOSITORY,
      sourceIdentifier: repositoryId,
    });

    const thirdPartyUser = Fixture.thirdPartyUser(
      Fixture.uuid(),
      dto.Provider.Github,
      `maintainer-${Fixture.uuid()}@example.com`,
    );
    const user = await userRepo.insert(Fixture.createUser(thirdPartyUser));
    const developerProfile = await developerProfileRepo.create(
      user.id,
      thirdPartyUser.email ?? `maintainer-${Fixture.uuid()}@example.com`,
    );

    await developerProjectItemRepo.create(
      developerProfile.id,
      ownerItem.id,
      [] as dto.MergeRightsType[],
      [] as dto.DeveloperRoleType[],
      undefined,
      [],
      [] as dto.ProjectCategory[],
    );

    return { ownerId, repositoryId, repositoryItem, developerProfile };
  }

  it("returns repository project details including maintainers", async () => {
    const { ownerId, repositoryId, repositoryItem, developerProfile } =
      await seedRepositoryProject();

    const response = await request(app).get(
      `/api/v1/projects/repos/${ownerId.login}/${repositoryId.name}/details`,
    );

    expect(response.status).toBe(StatusCodes.OK);
    const payload = response.body.success as dto.GetProjectDetailsResponse;

    expect(payload.project.projectItem.id.uuid).toEqual(repositoryItem.id.uuid);
    expect(payload.project.projectItem.projectItemType).toBe(
      dto.ProjectItemType.GITHUB_REPOSITORY,
    );
    expect(payload.service).toEqual([]);
    expect(payload.serviceOfferings).toEqual({});

    const developerKeys = Object.keys(payload.developers ?? {});
    expect(developerKeys).toContain(developerProfile.id.uuid);
    const developer =
      payload.developers[developerProfile.id.uuid] ??
      payload.developers[developerKeys[0]];
    expect(developer.project).toBeDefined();
  });

  it("returns owner project details when repository slug is absent", async () => {
    const { ownerId, developerProfile } = await seedRepositoryProject();

    const response = await request(app).get(
      `/api/v1/projects/owners/${ownerId.login}/details`,
    );

    expect(response.status).toBe(StatusCodes.OK);
    const payload = response.body.success as dto.GetProjectDetailsResponse;

    expect(payload.project.projectItem.projectItemType).toBe(
      dto.ProjectItemType.GITHUB_OWNER,
    );
    expect(Object.keys(payload.developers)).toContain(developerProfile.id.uuid);
    expect(payload.serviceOfferings).toBeDefined();
  });
});
