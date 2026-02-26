import { s } from "../../ts-rest";
import { contract } from "@open-source-economy/api-types";
import {
  getFinancialIssueRepository,
  issueFundingRepo,
  issueRepo,
  managedIssueRepo,
  planAndCreditsRepo,
  projectItemRepo,
  projectRepo,
} from "../../db";
import { DeveloperProfileService, githubSyncService } from "../../services";
import { pool } from "../../dbPool";
import { requireAuth, getAuthUser } from "../../middlewares/auth/ts-rest-auth";
import { ApiError } from "../../errors";
import { bridgeProject, bridgeFinancialIssue } from "../../utils/type-bridge";
import * as dto from "@open-source-economy/api-types";

const financialIssueRepo = getFinancialIssueRepository();
const developerProfileService = new DeveloperProfileService(pool);

export const projectsRouter = s.router(contract.projects, {
  getProjects: async () => {
    const projects = await projectRepo.getAll();
    return {
      status: 200 as const,
      body: { projects: projects.map(bridgeProject) },
    };
  },

  getProject: async ({ params }) => {
    const projectId = (
      params.repo
        ? { ownerId: { login: params.owner }, name: params.repo }
        : { login: params.owner }
    ) as any;
    const project = await projectRepo.getById(projectId);
    if (!project) {
      throw ApiError.notFound("Project not found");
    }
    return {
      status: 200 as const,
      body: { project: bridgeProject(project) },
    };
  },

  getProjectDetails: async ({ params }) => {
    const projectItemDetails = await projectItemRepo.getBySlugWithDetails(
      params.owner,
      params.repo,
    );

    if (!projectItemDetails) {
      throw ApiError.notFound("Project not found");
    }

    // Complex hydration logic - delegate to existing controller logic
    // using as any during migration since response types are complex
    const targetItem = projectItemDetails.projectItem;
    const targetItemId = targetItem.id;
    // sourceIdentifier is now a string; get owner/repo from project details
    const ownerLoginLower =
      projectItemDetails.owner?.id.login.toLowerCase() ?? undefined;
    const repositoryNameLower =
      projectItemDetails.repository?.id.name.toLowerCase() ?? undefined;

    const isProjectRelevant = (projectItem: dto.ProjectItem): boolean => {
      if (projectItem.id === targetItemId) return true;
      const identifier = projectItem.sourceIdentifier;
      if (
        ownerLoginLower &&
        projectItem.projectItemType === dto.ProjectItemType.GITHUB_OWNER
      ) {
        return identifier.toLowerCase() === ownerLoginLower;
      }
      if (
        ownerLoginLower &&
        projectItem.projectItemType === dto.ProjectItemType.GITHUB_REPOSITORY
      ) {
        const parts = identifier.split("/");
        if (parts.length >= 2 && parts[0].toLowerCase() === ownerLoginLower) {
          if (targetItem.projectItemType === dto.ProjectItemType.GITHUB_OWNER)
            return true;
          if (!repositoryNameLower) return false;
          return parts[1].toLowerCase() === repositoryNameLower;
        }
      }
      return false;
    };

    const dedupedDevelopers = Array.from(
      new Map(
        projectItemDetails.developers.map((developer) => [
          developer.developerProfile.id,
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
        fullProfile.profileEntry?.profile.id ?? developer.developerProfile.id;

      const sortedProjects = [...fullProfile.projects].sort((a, b) => {
        const aRelevant = isProjectRelevant(a.projectItem);
        const bRelevant = isProjectRelevant(b.projectItem);
        if (aRelevant && bRelevant) {
          const aIsTarget = a.projectItem.id === targetItemId;
          const bIsTarget = b.projectItem.id === targetItemId;
          if (aIsTarget || bIsTarget)
            return aIsTarget === bIsTarget ? 0 : aIsTarget ? -1 : 1;
          const aIsRepository =
            a.projectItem.projectItemType ===
            dto.ProjectItemType.GITHUB_REPOSITORY;
          const bIsRepository =
            b.projectItem.projectItemType ===
            dto.ProjectItemType.GITHUB_REPOSITORY;
          if (aIsRepository !== bIsRepository) return aIsRepository ? -1 : 1;
          return 0;
        }
        return aRelevant === bRelevant ? 0 : aRelevant ? -1 : 1;
      });

      const primaryProject =
        sortedProjects.find((entry) => entry.projectItem.id === targetItemId) ??
        sortedProjects.find((entry) => isProjectRelevant(entry.projectItem)) ??
        sortedProjects[0];

      if (!primaryProject) continue;

      const relevantProjectItemId = primaryProject.developerProjectItem.id;
      const developerServices: Record<string, dto.DeveloperService> = {};

      for (const serviceEntry of fullProfile.services) {
        const developerService = serviceEntry.developerService;
        if (!developerService) continue;
        const isLinkedToProject = developerService.developerProjectItemIds.some(
          (dpiId) => dpiId === relevantProjectItemId,
        );
        if (!isLinkedToProject) continue;
        const serviceId = serviceEntry.service.id;
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
        if (offerings) offerings.push(offering);
        else serviceOfferingsMap.set(serviceId, [offering]);
      }

      developersResponse[profileId] = {
        profileEntry: fullProfile.profileEntry,
        settings: fullProfile.settings,
        project: primaryProject,
        services: developerServices,
      };
    }

    return {
      status: 200 as const,
      body: {
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
      } as any,
    };
  },

  getProjectItemsWithDetails: async ({ query }) => {
    const [repositories, owners, urls, stats] = await Promise.all([
      projectItemRepo.getAllWithDetails(
        dto.ProjectItemType.GITHUB_REPOSITORY,
        query.repositories as any,
      ),
      projectItemRepo.getAllWithDetails(
        dto.ProjectItemType.GITHUB_OWNER,
        query.owners as any,
      ),
      projectItemRepo.getAllWithDetails(
        dto.ProjectItemType.URL,
        query.urls as any,
      ),
      projectItemRepo.getProjectItemsStats(),
    ]);

    return {
      status: 200 as const,
      body: { repositories, owners, urls, stats } as any,
    };
  },

  getCampaign: async ({ params }) => {
    // Campaign logic - delegate to existing repo
    const projectId = (
      params.repo
        ? { ownerId: { login: params.owner }, name: params.repo }
        : { login: params.owner }
    ) as any;
    // TODO: Implement campaign endpoint
    throw ApiError.notFound("Campaign not found");
  },

  getAllFinancialIssues: async () => {
    const issues = await financialIssueRepo.getAll();
    return {
      status: 200 as const,
      body: { issues: issues.map(bridgeFinancialIssue) },
    };
  },

  getIssue: async ({ params }) => {
    const ownerId = { login: params.owner } as dto.OwnerId;
    const repositoryId = { ownerId, name: params.repo } as dto.RepositoryId;
    const issueId = { repositoryId, number: params.number } as dto.IssueId;
    const issue = await financialIssueRepo.get(issueId);
    if (!issue) {
      throw ApiError.notFound("Issue not found");
    }
    return {
      status: 200 as const,
      body: { issue: bridgeFinancialIssue(issue) },
    };
  },

  fundIssue: {
    middleware: [requireAuth],
    handler: async ({ params, body, req }) => {
      const user = getAuthUser(req);
      const ownerId = { login: params.owner } as dto.OwnerId;
      const repositoryId = { ownerId, name: params.repo } as dto.RepositoryId;
      const issue = await issueRepo.getById({
        repositoryId,
        number: params.number,
      } as dto.IssueId);
      if (!issue) {
        throw ApiError.notFound("Issue not found");
      }
      const companyId = body.companyId
        ? (body.companyId as dto.CompanyId)
        : undefined;
      const creditAmount = body.creditAmount;
      const managedIssue = await managedIssueRepo.getByIssueId(issue.id);
      if (managedIssue?.state === dto.ManagedIssueState.REJECTED) {
        throw ApiError.forbidden(
          "Cannot fund an issue where funding was rejected before.",
        );
      }
      const availableCredit = await planAndCreditsRepo.getAvailableCredit(
        req.user!.id,
        companyId,
      );
      if (creditAmount > availableCredit) {
        throw ApiError.paymentRequired("Not enough credits");
      }
      if (availableCredit < 0) {
        throw ApiError.internal("The amount of available credit is negative");
      }
      const funding = {
        githubIssueId: issue.id,
        userId: req.user!.id,
        creditAmount,
      } as any;
      await issueFundingRepo.create(funding);
      return { status: 201 as const, body: {} };
    },
  },

  requestIssueFunding: {
    middleware: [requireAuth],
    handler: async ({ params, body, req }) => {
      const user = getAuthUser(req);
      const ownerId = { login: params.owner } as dto.OwnerId;
      const repositoryId = { ownerId, name: params.repo } as dto.RepositoryId;
      const issue = await issueRepo.getById({
        repositoryId,
        number: params.number,
      } as dto.IssueId);
      if (!issue) {
        throw ApiError.notFound("Issue not found in the DB");
      }
      if (issue.closedAt) {
        throw ApiError.forbidden("Cannot request funding for a closed issue");
      }
      const managedIssue = await managedIssueRepo.getByIssueId(issue.id);
      if (!managedIssue) {
        const createBody = {
          githubIssueId: issue.id,
          requestedCreditAmount: body.creditAmount,
          managerId: req.user!.id,
          contributorVisibility: dto.ContributorVisibility.PRIVATE,
          state: dto.ManagedIssueState.OPEN,
        } as any;
        await managedIssueRepo.create(createBody);
      } else if (managedIssue.managerId !== req.user!.id) {
        throw ApiError.forbidden("Someone else is already managing this issue");
      } else if (managedIssue.state !== dto.ManagedIssueState.OPEN) {
        throw ApiError.forbidden(
          "This issue funding is already being REJECTED or SOLVED",
        );
      } else {
        managedIssue.requestedCreditAmount = body.creditAmount;
        await managedIssueRepo.update(managedIssue);
      }
      return { status: 201 as const, body: {} };
    },
  },

  getProjectServices: async ({ params }) => {
    // TODO: Implement project services endpoint
    return {
      status: 200 as const,
      body: { services: [], comingSoonServices: [] } as any,
    };
  },
});
