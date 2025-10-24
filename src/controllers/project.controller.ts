import { Request, Response } from "express";
import * as dto from "@open-source-economy/api-types";
import {
  ApiError,
  CompanyId,
  ContributorVisibility,
  IssueId,
  ManagedIssueState,
  OwnerId,
  Project,
  ProjectUtils,
  RepositoryId,
} from "@open-source-economy/api-types";
import { StatusCodes } from "http-status-codes";
import {
  getFinancialIssueRepository,
  issueFundingRepo,
  issueRepo,
  managedIssueRepo,
  planAndCreditsRepo,
  projectItemRepo,
  projectRepo,
} from "../db";
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

  getProjectItemsWithDetails(
    req: Request<
      dto.GetProjectItemsWithDetailsParams,
      dto.ResponseBody<dto.GetProjectItemsWithDetailsResponse>,
      dto.GetProjectItemsWithDetailsBody,
      dto.GetProjectItemsWithDetailsQuery
    >,
    res: Response<dto.ResponseBody<dto.GetProjectItemsWithDetailsResponse>>,
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

  async getProjectItemsWithDetails(
    req: Request<
      dto.GetProjectItemsWithDetailsParams,
      dto.ResponseBody<dto.GetProjectItemsWithDetailsResponse>,
      dto.GetProjectItemsWithDetailsBody,
      dto.GetProjectItemsWithDetailsQuery
    >,
    res: Response<dto.ResponseBody<dto.GetProjectItemsWithDetailsResponse>>,
  ): Promise<void> {
    const {
      repositories: repoQuery,
      owners: ownersQuery,
      urls: urlsQuery,
    } = req.query;

    // Get all project items from database
    const result = await projectItemRepo.getAllWithDetails({});

    // Group project items by type
    const repositories: dto.ProjectItemWithDetails[] = [];
    const owners: dto.ProjectItemWithDetails[] = [];
    const urls: dto.ProjectItemWithDetails[] = [];

    for (const item of result.projectItems) {
      switch (item.projectItem.projectItemType) {
        case dto.ProjectItemType.GITHUB_REPOSITORY:
          repositories.push(item);
          break;
        case dto.ProjectItemType.GITHUB_OWNER:
          owners.push(item);
          break;
        case dto.ProjectItemType.URL:
          urls.push(item);
          break;
      }
    }

    // Sort repositories if sortBy is specified
    if (repoQuery?.sortBy) {
      const order = repoQuery.sortOrder === dto.SortOrder.ASC ? 1 : -1;
      repositories.sort((a, b) => {
        switch (repoQuery.sortBy) {
          case dto.ProjectItemSortField.STARGAZERS:
          case dto.ProjectItemSortField.STARS:
            return (
              ((b.repository?.stargazersCount ?? 0) -
                (a.repository?.stargazersCount ?? 0)) *
              order
            );
          case dto.ProjectItemSortField.FORKS:
            return (
              ((b.repository?.forksCount ?? 0) -
                (a.repository?.forksCount ?? 0)) *
              order
            );
          case dto.ProjectItemSortField.CREATED_AT:
            return (
              (b.projectItem.createdAt.getTime() -
                a.projectItem.createdAt.getTime()) *
              order
            );
          case dto.ProjectItemSortField.UPDATED_AT:
            return (
              (b.projectItem.updatedAt.getTime() -
                a.projectItem.updatedAt.getTime()) *
              order
            );
          default:
            return 0;
        }
      });
    }

    // Sort owners if sortBy is specified
    if (ownersQuery?.sortBy) {
      const order = ownersQuery.sortOrder === dto.SortOrder.ASC ? 1 : -1;
      owners.sort((a, b) => {
        switch (ownersQuery.sortBy) {
          case dto.ProjectItemSortField.FOLLOWERS:
            return (
              ((b.owner?.followers ?? 0) - (a.owner?.followers ?? 0)) * order
            );
          case dto.ProjectItemSortField.CREATED_AT:
            return (
              (b.projectItem.createdAt.getTime() -
                a.projectItem.createdAt.getTime()) *
              order
            );
          case dto.ProjectItemSortField.UPDATED_AT:
            return (
              (b.projectItem.updatedAt.getTime() -
                a.projectItem.updatedAt.getTime()) *
              order
            );
          default:
            return 0;
        }
      });
    }

    // Sort URLs if sortBy is specified
    if (urlsQuery?.sortBy) {
      const order = urlsQuery.sortOrder === dto.SortOrder.ASC ? 1 : -1;
      urls.sort((a, b) => {
        switch (urlsQuery.sortBy) {
          case dto.ProjectItemSortField.CREATED_AT:
            return (
              (b.projectItem.createdAt.getTime() -
                a.projectItem.createdAt.getTime()) *
              order
            );
          case dto.ProjectItemSortField.UPDATED_AT:
            return (
              (b.projectItem.updatedAt.getTime() -
                a.projectItem.updatedAt.getTime()) *
              order
            );
          default:
            return 0;
        }
      });
    }

    // Apply per-type limits
    const limitedRepositories = repoQuery?.limit !== undefined
      ? repositories.slice(0, repoQuery.limit)
      : repositories;
    const limitedOwners = ownersQuery?.limit !== undefined
      ? owners.slice(0, ownersQuery.limit)
      : owners;
    const limitedUrls = urlsQuery?.limit !== undefined
      ? urls.slice(0, urlsQuery.limit)
      : urls;

    // Calculate statistics from ALL project items (before limiting)
    const uniqueMaintainers = new Set<string>();
    let totalStars = 0;
    let totalForks = 0;
    let totalFollowers = 0;

    // Count maintainers from all project items
    for (const item of result.projectItems) {
      for (const dev of item.developers) {
        uniqueMaintainers.add(dev.developerProfile.id.uuid);
      }
    }

    // Sum stars and forks from repositories
    for (const repo of repositories) {
      totalStars += repo.repository?.stargazersCount ?? 0;
      totalForks += repo.repository?.forksCount ?? 0;
    }

    // Sum followers from owners
    for (const owner of owners) {
      totalFollowers += owner.owner?.followers ?? 0;
    }

    const response: dto.GetProjectItemsWithDetailsResponse = {
      repositories: limitedRepositories,
      owners: limitedOwners,
      urls: limitedUrls,
      stats: {
        totalProjects: result.total,
        totalMaintainers: uniqueMaintainers.size,
        totalStars,
        totalForks,
        totalFollowers,
      },
    };
    res.status(StatusCodes.OK).send({ success: response });
  },
};
