import { Request, Response } from "express";
import * as dto from "@open-source-economy/api-types";
import { OwnerId, RepositoryId } from "@open-source-economy/api-types";
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
};
