import { Request, Response } from "express";
import * as dto from "@open-source-economy/api-types";
import { OwnerId, RepositoryId } from "@open-source-economy/api-types";
import { StatusCodes } from "http-status-codes";
import { githubSyncService } from "../services";

export interface GitHubController {
  getOwner(
    req: Request<dto.GetOwnerParams, dto.GetOwnerResponse, {}, dto.GetOwnerQuery>,
    res: Response<dto.GetOwnerResponse>
  ): Promise<void>;

  getRepository(
    req: Request<dto.GetRepositoryParams, dto.GetRepositoryResponse, {}, dto.GetRepositoryQuery>,
    res: Response<dto.GetRepositoryResponse>
  ): Promise<void>;

  syncOwner(
    req: Request<dto.SyncOwnerParams, dto.SyncOwnerResponse, dto.SyncOwnerBody, dto.SyncOwnerQuery>,
    res: Response<dto.SyncOwnerResponse>
  ): Promise<void>;

  syncRepository(
    req: Request<dto.SyncRepositoryParams, dto.SyncRepositoryResponse, dto.SyncRepositoryBody, dto.SyncRepositoryQuery>,
    res: Response<dto.SyncRepositoryResponse>
  ): Promise<void>;

  syncProject(
    req: Request<dto.SyncProjectParams, dto.SyncProjectResponse, dto.SyncProjectBody, dto.SyncProjectQuery>,
    res: Response<dto.SyncProjectResponse>
  ): Promise<void>;

  syncAll(
    req: Request<
      {},
      {
        syncedOwners: number;
        syncedRepositories: number;
        errors: number;
      },
      {},
      {}
    >,
    res: Response<{
      syncedOwners: number;
      syncedRepositories: number;
      errors: number;
    }>
  ): Promise<void>;
}

export const GitHubController: GitHubController = {
  async getOwner(
    req: Request<dto.GetOwnerParams, dto.GetOwnerResponse, {}, dto.GetOwnerQuery>,
    res: Response<dto.GetOwnerResponse>
  ) {
    const owner = await githubSyncService.syncOwner({
      login: req.params.owner,
    } as OwnerId);
    const response: dto.GetOwnerResponse = { owner };
    res.status(StatusCodes.OK).send(response);
  },

  async getRepository(
    req: Request<dto.GetRepositoryParams, dto.GetRepositoryResponse, {}, dto.GetRepositoryQuery>,
    res: Response<dto.GetRepositoryResponse>
  ) {
    const ownerId: OwnerId = { login: req.params.owner };
    const repositoryId: RepositoryId = { ownerId, name: req.params.repo };
    const [owner, repository] = await githubSyncService.syncRepository(repositoryId);
    const response: dto.GetRepositoryResponse = { owner, repository };
    res.status(StatusCodes.OK).send(response);
  },

  async syncOwner(
    req: Request<dto.SyncOwnerParams, dto.SyncOwnerResponse, dto.SyncOwnerBody, dto.SyncOwnerQuery>,
    res: Response<dto.SyncOwnerResponse>
  ) {
    const ownerId: OwnerId = { login: req.params.owner };
    const owner = await githubSyncService.syncOwner(ownerId);
    const response: dto.SyncOwnerResponse = { owner };
    res.status(StatusCodes.OK).send(response);
  },

  async syncRepository(
    req: Request<dto.SyncRepositoryParams, dto.SyncRepositoryResponse, dto.SyncRepositoryBody, dto.SyncRepositoryQuery>,
    res: Response<dto.SyncRepositoryResponse>
  ) {
    const ownerId: OwnerId = { login: req.params.owner };
    const repositoryId: RepositoryId = { ownerId, name: req.params.repo };
    const [owner, repository] = await githubSyncService.syncRepository(repositoryId);
    const response: dto.SyncRepositoryResponse = { owner, repository };
    res.status(StatusCodes.OK).send(response);
  },

  async syncProject(
    req: Request<dto.SyncProjectParams, dto.SyncProjectResponse, dto.SyncProjectBody, dto.SyncProjectQuery>,
    res: Response<dto.SyncProjectResponse>
  ) {
    let projectId: OwnerId | RepositoryId;

    if ((req.params as any).repo) {
      const ownerId: OwnerId = { login: req.params.owner };
      projectId = { ownerId, name: (req.params as any).repo } as RepositoryId;
    } else {
      projectId = { login: req.params.owner } as OwnerId;
    }

    const [owner, repository] = await githubSyncService.syncProject(projectId);
    const response: dto.SyncProjectResponse = { owner, repository };
    res.status(StatusCodes.OK).send(response);
  },

  async syncAll(
    req: Request<
      {},
      {
        syncedOwners: number;
        syncedRepositories: number;
        errors: number;
      },
      {},
      {}
    >,
    res: Response<{
      syncedOwners: number;
      syncedRepositories: number;
      errors: number;
    }>
  ) {
    const result = await githubSyncService.syncAllProjectItems();
    res.status(StatusCodes.OK).send(result);
  },
};
