import { Request, Response } from "express";
import * as dto from "@open-source-economy/api-types";
import {
  OwnerId,
  ProjectId,
  RepositoryId,
} from "@open-source-economy/api-types";
import { StatusCodes } from "http-status-codes";
import { githubSyncService } from "../services";

export interface GitHubController {
  getOwner(
    req: Request<
      dto.GetOwnerParams,
      dto.ResponseBody<dto.GetOwnerResponse>,
      dto.GetOwnerBody,
      dto.GetOwnerQuery
    >,
    res: Response<dto.ResponseBody<dto.GetOwnerResponse>>,
  ): Promise<void>;

  getRepository(
    req: Request<
      dto.GetRepositoryParams,
      dto.ResponseBody<dto.GetRepositoryResponse>,
      dto.GetRepositoryBody,
      dto.GetRepositoryQuery
    >,
    res: Response<dto.ResponseBody<dto.GetRepositoryResponse>>,
  ): Promise<void>;

  syncOwner(
    req: Request<
      dto.SyncOwnerParams,
      dto.ResponseBody<dto.SyncOwnerResponse>,
      dto.SyncOwnerBody,
      dto.SyncOwnerQuery
    >,
    res: Response<dto.ResponseBody<dto.SyncOwnerResponse>>,
  ): Promise<void>;

  syncRepository(
    req: Request<
      dto.SyncRepositoryParams,
      dto.ResponseBody<dto.SyncRepositoryResponse>,
      dto.SyncRepositoryBody,
      dto.SyncRepositoryQuery
    >,
    res: Response<dto.ResponseBody<dto.SyncRepositoryResponse>>,
  ): Promise<void>;

  syncProject(
    req: Request<
      dto.SyncProjectParams,
      dto.ResponseBody<dto.SyncProjectResponse>,
      dto.SyncProjectBody,
      dto.SyncProjectQuery
    >,
    res: Response<dto.ResponseBody<dto.SyncProjectResponse>>,
  ): Promise<void>;

  syncAll(
    req: Request<
      {},
      dto.ResponseBody<{
        syncedOwners: number;
        syncedRepositories: number;
        errors: number;
      }>,
      {},
      {}
    >,
    res: Response<
      dto.ResponseBody<{
        syncedOwners: number;
        syncedRepositories: number;
        errors: number;
      }>
    >,
  ): Promise<void>;
}

export const GitHubController: GitHubController = {
  async getOwner(
    req: Request<
      dto.GetOwnerParams,
      dto.ResponseBody<dto.GetOwnerResponse>,
      dto.GetOwnerBody,
      dto.GetOwnerQuery
    >,
    res: Response<dto.ResponseBody<dto.GetOwnerResponse>>,
  ) {
    const owner = await githubSyncService.syncOwner(
      new OwnerId(req.params.owner),
    );
    const response: dto.GetOwnerResponse = { owner };
    res.status(StatusCodes.OK).send({ success: response });
  },

  async getRepository(
    req: Request<
      dto.GetRepositoryParams,
      dto.ResponseBody<dto.GetRepositoryResponse>,
      dto.GetRepositoryBody,
      dto.GetRepositoryQuery
    >,
    res: Response<dto.ResponseBody<dto.GetRepositoryResponse>>,
  ) {
    const ownerId = new OwnerId(req.params.owner);
    const repositoryId = new RepositoryId(ownerId, req.params.repo);
    const [owner, repository] =
      await githubSyncService.syncRepository(repositoryId);
    const response: dto.GetRepositoryResponse = { owner, repository };
    res.status(StatusCodes.OK).send({ success: response });
  },

  async syncOwner(
    req: Request<
      dto.SyncOwnerParams,
      dto.ResponseBody<dto.SyncOwnerResponse>,
      dto.SyncOwnerBody,
      dto.SyncOwnerQuery
    >,
    res: Response<dto.ResponseBody<dto.SyncOwnerResponse>>,
  ) {
    const owner = await githubSyncService.syncOwner(
      new OwnerId(req.params.owner),
    );
    const response: dto.SyncOwnerResponse = { owner };
    res.status(StatusCodes.OK).send({ success: response });
  },

  async syncRepository(
    req: Request<
      dto.SyncRepositoryParams,
      dto.ResponseBody<dto.SyncRepositoryResponse>,
      dto.SyncRepositoryBody,
      dto.SyncRepositoryQuery
    >,
    res: Response<dto.ResponseBody<dto.SyncRepositoryResponse>>,
  ) {
    const ownerId = new OwnerId(req.params.owner);
    const repositoryId = new RepositoryId(ownerId, req.params.repo);
    const [owner, repository] =
      await githubSyncService.syncRepository(repositoryId);
    const response: dto.SyncRepositoryResponse = { owner, repository };
    res.status(StatusCodes.OK).send({ success: response });
  },

  async syncProject(
    req: Request<
      dto.SyncProjectParams,
      dto.ResponseBody<dto.SyncProjectResponse>,
      dto.SyncProjectBody,
      dto.SyncProjectQuery
    >,
    res: Response<dto.ResponseBody<dto.SyncProjectResponse>>,
  ) {
    let projectId: ProjectId;

    if (req.params.repo) {
      const ownerId = new OwnerId(req.params.owner);
      projectId = new RepositoryId(ownerId, req.params.repo);
    } else {
      projectId = new OwnerId(req.params.owner);
    }

    const [owner, repository] = await githubSyncService.syncProject(projectId);
    const response: dto.SyncProjectResponse = { owner, repository };
    res.status(StatusCodes.OK).send({ success: response });
  },

  async syncAll(
    req: Request<
      {},
      dto.ResponseBody<{
        syncedOwners: number;
        syncedRepositories: number;
        errors: number;
      }>,
      {},
      {}
    >,
    res: Response<
      dto.ResponseBody<{
        syncedOwners: number;
        syncedRepositories: number;
        errors: number;
      }>
    >,
  ) {
    const result = await githubSyncService.syncAllProjectItems();
    res.status(StatusCodes.OK).send({ success: result });
  },
};
