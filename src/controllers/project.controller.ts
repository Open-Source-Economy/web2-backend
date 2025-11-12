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
import { DeveloperProfileService, githubSyncService } from "../services";
import { pool } from "../dbPool";

const financialIssueRepo = getFinancialIssueRepository();
const developerProfileService = new DeveloperProfileService(pool);

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

  getProjectDetails(
    req: Request<
      dto.GetProjectDetailsParams,
      dto.ResponseBody<dto.GetProjectDetailsResponse>,
      dto.GetProjectDetailsBody,
      dto.GetProjectDetailsQuery
    >,
    res: Response<dto.ResponseBody<dto.GetProjectDetailsResponse>>,
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
    const project = new Project(owner, repositoryOp ?? undefined);
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

    const [repositories, owners, urls, stats] = await Promise.all([
      projectItemRepo.getAllWithDetails(
        dto.ProjectItemType.GITHUB_REPOSITORY,
        repoQuery,
      ),
      projectItemRepo.getAllWithDetails(
        dto.ProjectItemType.GITHUB_OWNER,
        ownersQuery,
      ),
      projectItemRepo.getAllWithDetails(dto.ProjectItemType.URL, urlsQuery),
      projectItemRepo.getProjectItemsStats(),
    ]);

    const response: dto.GetProjectItemsWithDetailsResponse = {
      repositories,
      owners,
      urls,
      stats,
    };
    res.status(StatusCodes.OK).send({ success: response });
  },

  async getProjectDetails(
    req: Request<
      dto.GetProjectDetailsParams,
      dto.ResponseBody<dto.GetProjectDetailsResponse>,
      dto.GetProjectDetailsBody,
      dto.GetProjectDetailsQuery
    >,
    res: Response<dto.ResponseBody<dto.GetProjectDetailsResponse>>,
  ): Promise<void> {
    // 1. Load the project (owner or repo) together with raw developer rows.
    const { owner, repo } = req.params;
    const projectItemDetails = await projectItemRepo.getBySlugWithDetails(
      owner,
      repo,
    );

    if (!projectItemDetails) {
      res.sendStatus(StatusCodes.NOT_FOUND);
      return;
    }

    // 2. Prepare a couple of helpers used throughout the rest of the routine.
    const targetItem = projectItemDetails.projectItem;
    const targetItemId = targetItem.id.uuid;
    const ownerLoginLower =
      projectItemDetails.owner?.id.login.toLowerCase() ??
      (targetItem.projectItemType === dto.ProjectItemType.GITHUB_REPOSITORY &&
      targetItem.sourceIdentifier instanceof RepositoryId
        ? targetItem.sourceIdentifier.ownerId.login.toLowerCase()
        : targetItem.projectItemType === dto.ProjectItemType.GITHUB_OWNER &&
            targetItem.sourceIdentifier instanceof OwnerId
          ? targetItem.sourceIdentifier.login.toLowerCase()
          : undefined);
    const repositoryNameLower =
      targetItem.projectItemType === dto.ProjectItemType.GITHUB_REPOSITORY &&
      targetItem.sourceIdentifier instanceof RepositoryId
        ? targetItem.sourceIdentifier.name.toLowerCase()
        : undefined;

    const isProjectRelevant = (projectItem: dto.ProjectItem): boolean => {
      if (projectItem.id.uuid === targetItemId) {
        return true;
      }

      const identifier = projectItem.sourceIdentifier;

      if (
        ownerLoginLower &&
        projectItem.projectItemType === dto.ProjectItemType.GITHUB_OWNER &&
        identifier instanceof OwnerId
      ) {
        return identifier.login.toLowerCase() === ownerLoginLower;
      }

      if (
        ownerLoginLower &&
        projectItem.projectItemType === dto.ProjectItemType.GITHUB_REPOSITORY &&
        identifier instanceof RepositoryId &&
        identifier.ownerId.login.toLowerCase() === ownerLoginLower
      ) {
        if (targetItem.projectItemType === dto.ProjectItemType.GITHUB_OWNER) {
          return true;
        }
        if (!repositoryNameLower) {
          return false;
        }
        return identifier.name.toLowerCase() === repositoryNameLower;
      }

      return false;
    };

    // 3. Hydrate developers with profile/settings/projects/services info.
    const dedupedDevelopers = Array.from(
      new Map(
        projectItemDetails.developers.map((developer) => [
          developer.developerProfile.id.uuid,
          developer,
        ]),
      ).values(),
    );

    const hydratedDevelopers = await Promise.all(
      dedupedDevelopers.map(async (developer) => ({
        developer,
        fullProfile: await developerProfileService.buildFullDeveloperProfile(
          developer.developerProfile,
        ),
      })),
    );

    const developersResponse: Record<string, dto.ProjectDeveloperProfile> = {};
    const servicesMap = new Map<string, dto.Service>();
    const serviceOfferingsMap = new Map<string, dto.ProjectServiceOffering[]>();

    for (const { developer, fullProfile } of hydratedDevelopers) {
      const profileId =
        fullProfile.profileEntry?.profile.id.uuid ??
        developer.developerProfile.id.uuid;

      const sortedProjects = [...fullProfile.projects].sort((a, b) => {
        const aRelevant = isProjectRelevant(a.projectItem);
        const bRelevant = isProjectRelevant(b.projectItem);

        if (aRelevant && bRelevant) {
          const aIsTarget = a.projectItem.id.uuid === targetItemId;
          const bIsTarget = b.projectItem.id.uuid === targetItemId;
          if (aIsTarget || bIsTarget) {
            return aIsTarget === bIsTarget ? 0 : aIsTarget ? -1 : 1;
          }

          const aIsRepository =
            a.projectItem.projectItemType ===
            dto.ProjectItemType.GITHUB_REPOSITORY;
          const bIsRepository =
            b.projectItem.projectItemType ===
            dto.ProjectItemType.GITHUB_REPOSITORY;
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
        sortedProjects.find(
          (entry) => entry.projectItem.id.uuid === targetItemId,
        ) ??
        sortedProjects.find((entry) => isProjectRelevant(entry.projectItem)) ??
        sortedProjects[0];

      if (!primaryProject) {
        continue;
      }

      const relevantProjectItemId = primaryProject.developerProjectItem.id.uuid;

      const developerServices: Record<string, dto.DeveloperService> = {};

      for (const serviceEntry of fullProfile.services) {
        const developerService = serviceEntry.developerService;
        if (!developerService) {
          continue;
        }

        const isLinkedToProject = developerService.developerProjectItemIds.some(
          (dpiId) => dpiId.uuid === relevantProjectItemId,
        );
        if (!isLinkedToProject) {
          continue;
        }

        const serviceId = serviceEntry.service.id.uuid;
        developerServices[serviceId] = developerService;
        servicesMap.set(serviceId, serviceEntry.service);

        const developerProfileId =
          fullProfile.profileEntry?.profile.id ?? developer.developerProfile.id;

        const offering: dto.ProjectServiceOffering = {};
        if (developerService.responseTimeHours) {
          offering.responseTimeHours = [
            [developerService.responseTimeHours, developerProfileId],
          ];
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
      service: Array.from(servicesMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
      serviceOfferings: Object.fromEntries(serviceOfferingsMap.entries()),
    };

    res.status(StatusCodes.OK).send({ success: response });
  },
};
