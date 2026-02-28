import { Request, Response } from "express";
import * as dto from "@open-source-economy/api-types";
import {
  CompanyId,
  ContributorVisibility,
  IssueId,
  ManagedIssueState,
  OwnerId,
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
import { DeveloperProfileService, githubSyncService } from "../services";
import { pool } from "../dbPool";
import { ApiError } from "../errors";

const financialIssueRepo = getFinancialIssueRepository();
const developerProfileService = new DeveloperProfileService(pool);

export interface ProjectController {
  getProject(
    req: Request<dto.GetProjectParams, dto.GetProjectResponse, {}, dto.GetProjectQuery>,
    res: Response<dto.GetProjectResponse>
  ): Promise<void>;

  getProjects(
    req: Request<dto.GetProjectsParams, dto.GetProjectsResponse, {}, dto.GetProjectsQuery>,
    res: Response<dto.GetProjectsResponse>
  ): Promise<void>;

  getAllFinancialIssues(
    req: Request<
      dto.GetAllFinancialIssuesParams,
      dto.GetAllFinancialIssuesResponse,
      {},
      dto.GetAllFinancialIssuesQuery
    >,
    res: Response<dto.GetAllFinancialIssuesResponse>
  ): Promise<void>;

  getIssue(
    req: Request<dto.GetIssueParams, dto.GetIssueResponse, {}, dto.GetIssueQuery>,
    res: Response<dto.GetIssueResponse>
  ): Promise<void>;

  createProject(
    req: Request<dto.GetProjectParams, dto.GetProjectResponse, {}, dto.GetProjectQuery>,
    res: Response<dto.GetProjectResponse>
  ): Promise<void>;

  fundIssue(
    req: Request<dto.FundIssueParams, dto.FundIssueResponse, dto.FundIssueBody, dto.FundIssueQuery>,
    res: Response<dto.FundIssueResponse>
  ): Promise<void>;

  requestIssueFunding(
    req: Request<
      dto.RequestIssueFundingParams,
      dto.RequestIssueFundingResponse,
      dto.RequestIssueFundingBody,
      dto.RequestIssueFundingQuery
    >,
    res: Response<dto.RequestIssueFundingResponse>
  ): Promise<void>;

  getProjectItemsWithDetails(
    req: Request<
      dto.GetProjectItemsWithDetailsParams,
      dto.GetProjectItemsWithDetailsResponse,
      {},
      dto.GetProjectItemsWithDetailsQuery
    >,
    res: Response<dto.GetProjectItemsWithDetailsResponse>
  ): Promise<void>;

  getProjectDetails(
    req: Request<dto.GetProjectDetailsParams, dto.GetProjectDetailsResponse, {}, dto.GetProjectDetailsQuery>,
    res: Response<dto.GetProjectDetailsResponse>
  ): Promise<void>;
}

export const ProjectController: ProjectController = {
  async getProject(
    req: Request<dto.GetProjectParams, dto.GetProjectResponse, {}, dto.GetProjectQuery>,
    res: Response<dto.GetProjectResponse>
  ): Promise<void> {
    const ownerId: OwnerId = { login: req.params.owner };
    const projectId: OwnerId | RepositoryId = req.params.repo ? { ownerId, name: req.params.repo } : ownerId;
    const project = await projectRepo.getById(projectId);
    if (project === null) {
      res.sendStatus(StatusCodes.NOT_FOUND);
    } else {
      const response: dto.GetProjectResponse = { project: project };
      res.status(StatusCodes.OK).send(response);
    }
  },

  async getProjects(
    req: Request<dto.GetProjectsParams, dto.GetProjectsResponse, {}, dto.GetProjectsQuery>,
    res: Response<dto.GetProjectsResponse>
  ): Promise<void> {
    const projects = await projectRepo.getAll();
    const response: dto.GetProjectsResponse = { projects: projects };
    res.status(StatusCodes.OK).send(response);
  },

  async getAllFinancialIssues(
    req: Request<
      dto.GetAllFinancialIssuesParams,
      dto.GetAllFinancialIssuesResponse,
      {},
      dto.GetAllFinancialIssuesQuery
    >,
    res: Response<dto.GetAllFinancialIssuesResponse>
  ) {
    const issues = await financialIssueRepo.getAll();
    const response: dto.GetAllFinancialIssuesResponse = { issues };
    res.status(StatusCodes.OK).send(response);
  },

  async getIssue(
    req: Request<dto.GetIssueParams, dto.GetIssueResponse, {}, dto.GetIssueQuery>,
    res: Response<dto.GetIssueResponse>
  ) {
    const ownerId: OwnerId = { login: req.params.owner };
    const repositoryId: RepositoryId = { ownerId, name: req.params.repo };
    const issueId: IssueId = { repositoryId, number: req.params.number };
    const issue = await financialIssueRepo.get(issueId);
    if (!issue) {
      res.sendStatus(StatusCodes.NOT_FOUND);
    } else {
      const response: dto.GetIssueResponse = { issue };
      res.status(StatusCodes.OK).send(response);
    }
  },

  async createProject(
    req: Request<dto.GetProjectParams, dto.GetProjectResponse, {}, dto.GetProjectQuery>,
    res: Response<dto.GetProjectResponse>
  ): Promise<void> {
    const ownerId: OwnerId = { login: req.params.owner };
    const projectId: OwnerId | RepositoryId = req.params.repo ? { ownerId, name: req.params.repo } : ownerId;
    const [owner, repositoryOp] = await githubSyncService.syncProject(projectId);
    const project: dto.Project = {
      owner,
      repository: repositoryOp ?? undefined,
    };
    const createdProject = await projectRepo.createOrUpdate(project);

    const response: dto.GetProjectResponse = { project: createdProject };
    res.status(StatusCodes.CREATED).send(response);
  },

  async fundIssue(
    req: Request<dto.FundIssueParams, dto.FundIssueResponse, dto.FundIssueBody, dto.FundIssueQuery>,
    res: Response<dto.FundIssueResponse>
  ) {
    if (!req.user) {
      throw ApiError.unauthorized("Unauthorized");
    }
    const ownerId: OwnerId = { login: req.params.owner };
    const repositoryId: RepositoryId = { ownerId, name: req.params.repo };
    const issue = await issueRepo.getById({
      repositoryId,
      number: req.params.number,
    } as IssueId);
    if (!issue) {
      res.sendStatus(StatusCodes.NOT_FOUND);
      return;
    }
    const companyId = req.body.companyId ? (req.body.companyId as CompanyId) : undefined;
    const creditAmount = req.body.creditAmount;
    const managedIssue = await managedIssueRepo.getByIssueId(issue.id);
    if (managedIssue?.state === ManagedIssueState.REJECTED) {
      throw ApiError.forbidden("Cannot fund an issue where funding was rejected before.");
    }
    const availableCredit = await planAndCreditsRepo.getAvailableCredit(req.user.id, companyId);
    if (creditAmount > availableCredit) {
      throw ApiError.paymentRequired("Not enough credits");
    }
    if (availableCredit < 0) {
      throw ApiError.internal("The amount of available credit is negative");
    }
    const funding = {
      githubIssueId: issue.id,
      userId: req.user.id,
      creditAmount,
    } as any;
    await issueFundingRepo.create(funding);
    res.sendStatus(StatusCodes.CREATED);
  },

  async requestIssueFunding(
    req: Request<
      dto.RequestIssueFundingParams,
      dto.RequestIssueFundingResponse,
      dto.RequestIssueFundingBody,
      dto.RequestIssueFundingQuery
    >,
    res: Response<dto.RequestIssueFundingResponse>
  ) {
    if (!req.user) {
      throw ApiError.unauthorized("Unauthorized");
    }
    const ownerId: OwnerId = { login: req.params.owner };
    const repositoryId: RepositoryId = { ownerId, name: req.params.repo };
    const issue = await issueRepo.getById({
      repositoryId,
      number: req.params.number,
    } as IssueId);
    if (!issue) {
      throw ApiError.notFound("Issue not found in the DB");
    }
    if (issue.closedAt) {
      throw ApiError.forbidden("Cannot request funding for a closed issue");
    }
    const managedIssue = await managedIssueRepo.getByIssueId(issue.id);
    if (!managedIssue) {
      const body = {
        githubIssueId: issue.id,
        requestedCreditAmount: req.body.creditAmount,
        managerId: req.user.id,
        contributorVisibility: ContributorVisibility.PRIVATE,
        state: ManagedIssueState.OPEN,
      };
      await managedIssueRepo.create(body);
      res.status(StatusCodes.CREATED).send({});
    } else if (managedIssue.managerId !== req.user.id) {
      throw ApiError.forbidden("Someone else is already managing this issue");
    } else if (managedIssue.state !== ManagedIssueState.OPEN) {
      throw ApiError.forbidden("This issue funding is already being REJECTED or SOLVED");
    } else {
      managedIssue.requestedCreditAmount = req.body.creditAmount;
      await managedIssueRepo.update(managedIssue);
      res.status(StatusCodes.OK).send({});
    }
  },

  async getProjectItemsWithDetails(
    req: Request<
      dto.GetProjectItemsWithDetailsParams,
      dto.GetProjectItemsWithDetailsResponse,
      {},
      dto.GetProjectItemsWithDetailsQuery
    >,
    res: Response<dto.GetProjectItemsWithDetailsResponse>
  ): Promise<void> {
    const { repositories: repoQuery, owners: ownersQuery, urls: urlsQuery } = req.query;

    const [repositories, owners, urls, stats] = await Promise.all([
      projectItemRepo.getAllWithDetails(dto.ProjectItemType.GITHUB_REPOSITORY, repoQuery),
      projectItemRepo.getAllWithDetails(dto.ProjectItemType.GITHUB_OWNER, ownersQuery),
      projectItemRepo.getAllWithDetails(dto.ProjectItemType.URL, urlsQuery),
      projectItemRepo.getProjectItemsStats(),
    ]);

    const response: dto.GetProjectItemsWithDetailsResponse = {
      repositories,
      owners,
      urls,
      stats,
    };
    res.status(StatusCodes.OK).send(response);
  },

  async getProjectDetails(
    req: Request<dto.GetProjectDetailsParams, dto.GetProjectDetailsResponse, {}, dto.GetProjectDetailsQuery>,
    res: Response<dto.GetProjectDetailsResponse>
  ): Promise<void> {
    // 1. Load the project (owner or repo) together with raw developer rows.
    const { owner, repo } = req.params;
    const projectItemDetails = await projectItemRepo.getBySlugWithDetails(owner, repo);

    if (!projectItemDetails) {
      res.sendStatus(StatusCodes.NOT_FOUND);
      return;
    }

    // 2. Prepare a couple of helpers used throughout the rest of the routine.
    const targetItem = projectItemDetails.projectItem;
    const targetItemId = targetItem.id;
    // sourceIdentifier is now a string; parse owner/repo info from it
    const _parsedSourceId = targetItem.sourceIdentifier;
    const ownerLoginLower = projectItemDetails.owner?.id.login.toLowerCase() ?? undefined;
    const repositoryNameLower = projectItemDetails.repository?.id.name.toLowerCase() ?? undefined;

    const isProjectRelevant = (projectItem: dto.ProjectItem): boolean => {
      if (projectItem.id === targetItemId) {
        return true;
      }

      if (ownerLoginLower && projectItem.projectItemType === dto.ProjectItemType.GITHUB_OWNER) {
        return projectItem.sourceIdentifier.toLowerCase() === ownerLoginLower;
      }

      if (ownerLoginLower && projectItem.projectItemType === dto.ProjectItemType.GITHUB_REPOSITORY) {
        // sourceIdentifier for repos is typically "owner/name"
        const parts = projectItem.sourceIdentifier.split("/");
        if (parts.length >= 2 && parts[0].toLowerCase() === ownerLoginLower) {
          if (targetItem.projectItemType === dto.ProjectItemType.GITHUB_OWNER) {
            return true;
          }
          if (!repositoryNameLower) {
            return false;
          }
          return parts[1].toLowerCase() === repositoryNameLower;
        }
      }

      return false;
    };

    // 3. Hydrate developers with profile/settings/projects/services info.
    const dedupedDevelopers = Array.from(
      new Map(projectItemDetails.developers.map((developer) => [developer.developerProfile.id, developer])).values()
    );

    const hydratedDevelopers = await Promise.all(
      dedupedDevelopers.map(async (developer) => ({
        developer,
        fullProfile: await developerProfileService.buildFullDeveloperProfile(developer.developerProfile),
      }))
    );

    const developersResponse: Record<string, dto.ProjectDeveloperProfile> = {};
    const servicesMap = new Map<string, dto.Service>();
    const serviceOfferingsMap = new Map<string, dto.ProjectServiceOffering[]>();

    for (const { developer, fullProfile } of hydratedDevelopers) {
      const profileId = fullProfile.profileEntry?.profile.id ?? developer.developerProfile.id;

      const sortedProjects = [...fullProfile.projects].sort((a, b) => {
        const aRelevant = isProjectRelevant(a.projectItem);
        const bRelevant = isProjectRelevant(b.projectItem);

        if (aRelevant && bRelevant) {
          const aIsTarget = a.projectItem.id === targetItemId;
          const bIsTarget = b.projectItem.id === targetItemId;
          if (aIsTarget || bIsTarget) {
            return aIsTarget === bIsTarget ? 0 : aIsTarget ? -1 : 1;
          }

          const aIsRepository = a.projectItem.projectItemType === dto.ProjectItemType.GITHUB_REPOSITORY;
          const bIsRepository = b.projectItem.projectItemType === dto.ProjectItemType.GITHUB_REPOSITORY;
          if (aIsRepository !== bIsRepository) {
            return aIsRepository ? -1 : 1;
          }

          return 0;
        }

        if (aRelevant === bRelevant) {
          return 0;
        }

        return aRelevant ? -1 : 1;
      });

      const primaryProject =
        sortedProjects.find((entry) => entry.projectItem.id === targetItemId) ??
        sortedProjects.find((entry) => isProjectRelevant(entry.projectItem)) ??
        sortedProjects[0];

      if (!primaryProject) {
        continue;
      }

      const relevantProjectItemId = primaryProject.developerProjectItem.id;

      const developerServices: Record<string, dto.DeveloperService> = {};

      for (const serviceEntry of fullProfile.services) {
        const developerService = serviceEntry.developerService;
        if (!developerService) {
          continue;
        }

        const isLinkedToProject = developerService.developerProjectItemIds.some(
          (dpiId) => dpiId === relevantProjectItemId
        );
        if (!isLinkedToProject) {
          continue;
        }

        const serviceId = serviceEntry.service.id;
        developerServices[serviceId] = developerService;
        servicesMap.set(serviceId, serviceEntry.service);

        const developerProfileId = fullProfile.profileEntry?.profile.id ?? developer.developerProfile.id;

        const offering: dto.ProjectServiceOffering = {};
        if (developerService.responseTimeHours) {
          offering.responseTimeHours = [[developerService.responseTimeHours, developerProfileId]];
        }
        const offerings = serviceOfferingsMap.get(serviceId);
        if (offerings) {
          offerings.push(offering);
        } else {
          serviceOfferingsMap.set(serviceId, [offering]);
        }
      }

      developersResponse[profileId] = {
        profileEntry: fullProfile.profileEntry,
        settings: fullProfile.settings,
        project: primaryProject,
        services: developerServices,
      };
    }

    // 4. Final response assembly.
    const response: dto.GetProjectDetailsResponse = {
      project: {
        projectItem: projectItemDetails.projectItem,
        owner: projectItemDetails.owner,
        repository: projectItemDetails.repository,
      },
      developers: developersResponse,
      service: Array.from(servicesMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      serviceOfferings: Object.fromEntries(serviceOfferingsMap.entries()),
    };

    res.status(StatusCodes.OK).send(response);
  },
};
