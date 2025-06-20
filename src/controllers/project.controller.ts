import { Request, Response } from "express";
import * as dto from "../api/dto";
import {
  CompanyId,
  ContributorVisibility,
  IssueId,
  ManagedIssueState,
  OwnerId,
  Project,
  ProjectUtils,
  RepositoryId,
} from "../api/model";
import { StatusCodes } from "http-status-codes";
import {
  getFinancialIssueRepository,
  issueFundingRepo,
  issueRepo,
  managedIssueRepo,
  planAndCreditsRepo,
  projectRepo,
} from "../db";
import { ApiError } from "../api/model/error/ApiError";
import { githubSyncService } from "../services";

const financialIssueRepo = getFinancialIssueRepository();

export interface ProjectController {
  getProject(
    req: Request<
      dto.GetProjectParams,
      dto.ResponseBody<dto.GetProjectResponse>,
      dto.GetProjectBody,
      dto.GetProjectQuery
    >,
    res: Response<dto.ResponseBody<dto.GetProjectResponse>>,
  ): Promise<void>;

  getProjects(
    req: Request<
      dto.GetProjectsParams,
      dto.ResponseBody<dto.GetProjectsResponse>,
      dto.GetProjectsBody,
      dto.GetProjectsQuery
    >,
    res: Response<dto.ResponseBody<dto.GetProjectsResponse>>,
  ): Promise<void>;

  getAllFinancialIssues(
    req: Request<
      dto.GetIssuesParams,
      dto.ResponseBody<dto.GetIssuesResponse>,
      dto.GetIssuesBody,
      dto.GetIssuesQuery
    >,
    res: Response<dto.ResponseBody<dto.GetIssuesResponse>>,
  ): Promise<void>;

  getIssue(
    req: Request<
      dto.GetIssueParams,
      dto.ResponseBody<dto.GetIssueResponse>,
      dto.GetIssueBody,
      dto.GetIssueQuery
    >,
    res: Response<dto.ResponseBody<dto.GetIssueResponse>>,
  ): Promise<void>;

  createProject(
    req: Request<
      dto.CreateProjectParams,
      dto.ResponseBody<dto.CreateProjectResponse>,
      dto.CreateProjectBody,
      dto.CreateProjectQuery
    >,
    res: Response<dto.ResponseBody<dto.CreateProjectResponse>>,
  ): Promise<void>;

  fundIssue(
    req: Request<
      dto.FundIssueParams,
      dto.ResponseBody<dto.FundIssueResponse>,
      dto.FundIssueBody,
      dto.FundIssueQuery
    >,
    res: Response<dto.ResponseBody<dto.FundIssueResponse>>,
  ): Promise<void>;

  requestIssueFunding(
    req: Request<
      dto.RequestIssueFundingParams,
      dto.ResponseBody<dto.RequestIssueFundingResponse>,
      dto.RequestIssueFundingBody,
      dto.RequestIssueFundingQuery
    >,
    res: Response<dto.ResponseBody<dto.RequestIssueFundingResponse>>,
  ): Promise<void>;
}

export const ProjectController: ProjectController = {
  async getProject(
    req: Request<
      dto.GetProjectParams,
      dto.ResponseBody<dto.GetProjectResponse>,
      dto.GetProjectBody,
      dto.GetProjectQuery
    >,
    res: Response<dto.ResponseBody<dto.GetProjectResponse>>,
  ): Promise<void> {
    const projectId = ProjectUtils.getId(req.params.owner, req.params.repo);
    const project = await projectRepo.getById(projectId);
    if (project === null) {
      res.sendStatus(StatusCodes.NOT_FOUND);
    } else {
      const response: dto.GetProjectResponse = { project: project };
      res.status(StatusCodes.OK).send({ success: response });
    }
  },

  async getProjects(
    req: Request<
      dto.GetProjectsParams,
      dto.ResponseBody<dto.GetProjectsResponse>,
      dto.GetProjectsBody,
      dto.GetProjectsQuery
    >,
    res: Response<dto.ResponseBody<dto.GetProjectsResponse>>,
  ): Promise<void> {
    const projects = await projectRepo.getAll();
    const response: dto.GetProjectsResponse = { projects: projects };
    res.status(StatusCodes.OK).send({ success: response });
  },

  async getAllFinancialIssues(
    req: Request<
      dto.GetIssuesParams,
      dto.ResponseBody<dto.GetIssuesResponse>,
      dto.GetIssuesBody,
      dto.GetIssuesQuery
    >,
    res: Response<dto.ResponseBody<dto.GetIssuesResponse>>,
  ) {
    const issues = await financialIssueRepo.getAll();
    const response: dto.GetIssuesResponse = { issues };
    res.status(StatusCodes.OK).send({ success: response });
  },

  async getIssue(
    req: Request<
      dto.GetIssueParams,
      dto.ResponseBody<dto.GetIssueResponse>,
      dto.GetIssueBody,
      dto.GetIssueQuery
    >,
    res: Response<dto.ResponseBody<dto.GetIssueResponse>>,
  ) {
    const ownerId = new OwnerId(req.params.owner);
    const repositoryId = new RepositoryId(ownerId, req.params.repo);
    const issueId = new IssueId(repositoryId, req.params.number);
    const issue = await financialIssueRepo.get(issueId);
    if (!issue) {
      res.sendStatus(StatusCodes.NOT_FOUND);
    } else {
      const response: dto.GetIssueResponse = { issue };
      res.status(StatusCodes.OK).send({ success: response });
    }
  },

  async createProject(
    req: Request<
      dto.CreateProjectParams,
      dto.ResponseBody<dto.CreateProjectResponse>,
      dto.CreateProjectBody,
      dto.CreateProjectQuery
    >,
    res: Response<dto.ResponseBody<dto.CreateProjectResponse>>,
  ): Promise<void> {
    const projectId = ProjectUtils.getId(req.params.owner, req.params.repo);
    const [owner, repositoryOp] =
      await githubSyncService.syncProject(projectId);
    const project = new Project(
      owner,
      repositoryOp ?? undefined,
      req.body.projectEcosystem,
    );
    const createdProject = await projectRepo.createOrUpdate(project);

    const response: dto.CreateProjectResponse = { project: createdProject };
    res.status(StatusCodes.CREATED).send({ success: response });
  },

  async fundIssue(
    req: Request<
      dto.FundIssueParams,
      dto.ResponseBody<dto.FundIssueResponse>,
      dto.FundIssueBody,
      dto.FundIssueQuery
    >,
    res: Response<dto.ResponseBody<dto.FundIssueResponse>>,
  ) {
    if (!req.user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Unauthorized");
    }
    const ownerId = new OwnerId(req.params.owner);
    const repositoryId = new RepositoryId(ownerId, req.params.repo);
    const issue = await issueRepo.getById(
      new IssueId(repositoryId, req.params.number),
    );
    if (!issue) {
      res.sendStatus(StatusCodes.NOT_FOUND);
      return;
    }
    const companyId = req.body.companyId
      ? new CompanyId(req.body.companyId)
      : undefined;
    const creditAmount = req.body.creditAmount;
    const managedIssue = await managedIssueRepo.getByIssueId(issue.id);
    if (managedIssue?.state === ManagedIssueState.REJECTED) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "Cannot fund an issue where funding was rejected before.",
      );
    }
    const availableCredit = await planAndCreditsRepo.getAvailableCredit(
      req.user.id,
      companyId,
    );
    if (creditAmount > availableCredit) {
      throw new ApiError(StatusCodes.PAYMENT_REQUIRED, "Not enough credits");
    }
    if (availableCredit < 0) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "The amount of available credit is negative",
      );
    }
    const funding: dto.CreateIssueFundingBody = {
      githubIssueId: issue.id,
      userId: req.user.id,
      creditAmount,
    };
    await issueFundingRepo.create(funding);
    res.sendStatus(StatusCodes.CREATED);
  },

  async requestIssueFunding(
    req: Request<
      dto.RequestIssueFundingParams,
      dto.ResponseBody<dto.RequestIssueFundingResponse>,
      dto.RequestIssueFundingBody,
      dto.RequestIssueFundingQuery
    >,
    res: Response<dto.ResponseBody<dto.RequestIssueFundingResponse>>,
  ) {
    if (!req.user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Unauthorized");
    }
    const ownerId = new OwnerId(req.params.owner);
    const repositoryId = new RepositoryId(ownerId, req.params.repo);
    const issue = await issueRepo.getById(
      new IssueId(repositoryId, req.params.number),
    );
    if (!issue) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Issue not found in the DB");
    }
    if (issue.closedAt) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "Cannot request funding for a closed issue",
      );
    }
    const managedIssue = await managedIssueRepo.getByIssueId(issue.id);
    if (!managedIssue) {
      const body: dto.CreateManagedIssueBody = {
        githubIssueId: issue.id,
        requestedCreditAmount: req.body.creditAmount,
        managerId: req.user.id,
        contributorVisibility: ContributorVisibility.PRIVATE,
        state: ManagedIssueState.OPEN,
      };
      await managedIssueRepo.create(body);
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
      managedIssue.requestedCreditAmount = req.body.creditAmount;
      await managedIssueRepo.update(managedIssue);
      res.status(StatusCodes.OK).send({ success: {} });
    }
  },
};
