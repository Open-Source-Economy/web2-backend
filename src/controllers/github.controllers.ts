import { Request, Response } from "express";
import {
  CreateIssueFundingBody,
  CreateManagedIssueBody,
  FundIssueBody,
  FundIssueParams,
  FundIssueQuery,
  FundIssueResponse,
  GetIssueBody,
  GetIssueParams,
  GetIssueQuery,
  GetIssueResponse,
  GetIssuesBody,
  GetIssuesParams,
  GetIssuesQuery,
  GetIssuesResponse,
  GetOwnerBody,
  GetOwnerParams,
  GetOwnerQuery,
  GetOwnerResponse,
  GetRepositoryBody,
  GetRepositoryParams,
  GetRepositoryQuery,
  GetRepositoryResponse,
  RequestIssueFundingBody,
  RequestIssueFundingParams,
  RequestIssueFundingQuery,
  RequestIssueFundingResponse,
  ResponseBody,
} from "../dtos";
import {
  CompanyId,
  ContributorVisibility,
  IssueId,
  ManagedIssueState,
  OwnerId,
  RepositoryId,
} from "../model";
import { getFinancialIssueRepository } from "../db/FinancialIssue.repository";
import { StatusCodes } from "http-status-codes";
import {
  getDowNumberRepository,
  getIssueFundingRepository,
  getIssueRepository,
  getManagedIssueRepository,
} from "../db";
import { ApiError } from "../model/error/ApiError";

const issueRepository = getIssueRepository();
const financialIssueRepository = getFinancialIssueRepository();
const dowNumberRepository = getDowNumberRepository();
const managedIssueRepository = getManagedIssueRepository();
const issueFundingRepo = getIssueFundingRepository();

export class GithubController {
  static async getOwner(
    req: Request<
      GetOwnerParams,
      ResponseBody<GetOwnerResponse>,
      GetOwnerBody,
      GetOwnerQuery
    >,
    res: Response<ResponseBody<GetOwnerResponse>>,
  ) {
    const owner = await financialIssueRepository.getOwner(
      new OwnerId(req.params.owner),
    );

    const response: GetOwnerResponse = {
      owner: owner,
    };
    res.status(StatusCodes.OK).send({ success: response });
  }

  static async getRepository(
    req: Request<
      GetRepositoryParams,
      ResponseBody<GetRepositoryResponse>,
      GetRepositoryBody,
      GetRepositoryQuery
    >,
    res: Response<ResponseBody<GetRepositoryResponse>>,
  ) {
    const repositoryId = new RepositoryId(
      new OwnerId(req.params.owner),
      req.params.repo,
    );
    const [owner, repository] =
      await financialIssueRepository.getRepository(repositoryId);

    const response: GetRepositoryResponse = {
      owner: owner,
      repository: repository,
    };
    res.status(StatusCodes.OK).send({ success: response });
  }

  static async getIssues(
    req: Request<
      GetIssuesParams,
      ResponseBody<GetIssuesResponse>,
      GetIssuesBody,
      GetIssuesQuery
    >,
    res: Response<ResponseBody<GetIssuesResponse>>,
  ) {
    const issues = await financialIssueRepository.getAll();

    const response: GetIssuesResponse = {
      issues: issues,
    };
    res.status(StatusCodes.OK).send({ success: response });
  }

  static async getIssue(
    req: Request<
      GetIssueParams,
      ResponseBody<GetIssueResponse>,
      GetIssueBody,
      GetIssueQuery
    >,
    res: Response<ResponseBody<GetIssueResponse>>,
  ) {
    const ownerId = new OwnerId(req.params.owner);
    const repositoryId = new RepositoryId(ownerId, req.params.repo);
    const issueId = new IssueId(repositoryId, req.params.number);

    const issue = await financialIssueRepository.get(issueId);

    if (issue === null) {
      res.sendStatus(StatusCodes.NOT_FOUND);
    } else {
      const response: GetIssueResponse = {
        issue: issue,
      };

      res.status(StatusCodes.OK).send({ success: response });
    }
  }

  // TODO: security issue - this operation does not have an atomic check for the user's DoWs, user can spend DoWs that they don't have
  static async fundIssue(
    req: Request<
      FundIssueParams,
      ResponseBody<FundIssueResponse>,
      FundIssueBody,
      FundIssueQuery
    >,
    res: Response<ResponseBody<FundIssueResponse>>,
  ) {
    if (!req.user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Unauthorized");
    }

    // TODO: fix this mess with optional githubId
    const ownerId = new OwnerId(req.params.owner);
    const repositoryId = new RepositoryId(ownerId, req.params.repo);
    const issue = await issueRepository.getById(
      new IssueId(repositoryId, req.params.number),
    );

    if (issue === null) {
      res.sendStatus(StatusCodes.NOT_FOUND);
      return;
    }

    const companyId = req.body.companyId
      ? new CompanyId(req.body.companyId)
      : undefined;
    const dowAmount = req.body.milliDowAmount;

    const managedIssue = await managedIssueRepository.getByIssueId(issue.id);
    if (
      managedIssue !== null &&
      managedIssue.state === ManagedIssueState.REJECTED
    ) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "Cannot fund an issue where funding was rejected before.",
      );
    }

    const availableDoWs = await dowNumberRepository.getAvailableMilliDoWs(
      req.user.id,
      companyId,
    );
    if (dowAmount > availableDoWs) {
      throw new ApiError(StatusCodes.PAYMENT_REQUIRED, "Not enough DoWs");
    }
    if (availableDoWs < 0) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "The amount of available DoWs is negative",
      );
    }

    const issueFunding: CreateIssueFundingBody = {
      githubIssueId: issue.id,
      userId: req.user.id,
      milliDowAmount: dowAmount,
    };

    await issueFundingRepo.create(issueFunding);

    return res.sendStatus(StatusCodes.CREATED);
  }

  static async requestIssueFunding(
    req: Request<
      RequestIssueFundingParams,
      ResponseBody<RequestIssueFundingResponse>,
      RequestIssueFundingBody,
      RequestIssueFundingQuery
    >,
    res: Response<ResponseBody<RequestIssueFundingResponse>>,
  ): Promise<void> {
    if (!req.user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Unauthorized");
    }

    const ownerId = new OwnerId(req.params.owner);
    const repositoryId = new RepositoryId(ownerId, req.params.repo);
    const issue = await issueRepository.getById(
      new IssueId(repositoryId, req.params.number),
    );

    if (issue === null)
      throw new ApiError(StatusCodes.NOT_FOUND, "Issue not found in the DB");
    else if (issue.closedAt !== null)
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "Cannot request funding for a closed issue",
      );

    const managedIssue = await managedIssueRepository.getByIssueId(issue.id);
    if (managedIssue === null) {
      const createManagedIssueBody: CreateManagedIssueBody = {
        githubIssueId: issue.id,
        requestedMilliDowAmount: req.body.milliDowAmount,
        managerId: req.user.id,
        contributorVisibility: ContributorVisibility.PRIVATE,
        state: ManagedIssueState.OPEN,
      };
      await managedIssueRepository.create(createManagedIssueBody);
      res.status(StatusCodes.CREATED).send({ success: {} });
    } else if (managedIssue.managerId !== req.user.id) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "Someone else is already managing this issue",
      );
    } else if (managedIssue.state !== ManagedIssueState.OPEN) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "This issue funding is already being REJECTED or SOLVED",
      );
    } else {
      managedIssue.requestedMilliDowAmount = req.body.milliDowAmount;
      await managedIssueRepository.update(managedIssue);
      res.status(StatusCodes.OK).send({ success: {} });
    }
  }
}
