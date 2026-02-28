import { s } from "../../ts-rest";
import { contract } from "@open-source-economy/api-types";
import { githubSyncService } from "../../services";
import { bridgeOwner, bridgeRepository } from "../../utils/type-bridge";
import type { OwnerId, RepositoryId } from "@open-source-economy/api-types";

export const githubRouter = s.router(contract.github, {
  getOwner: async ({ params }) => {
    const owner = await githubSyncService.syncOwner({
      login: params.owner,
    } as OwnerId);
    return {
      status: 200 as const,
      body: { owner: bridgeOwner(owner) },
    };
  },

  getRepository: async ({ params }) => {
    const ownerId = { login: params.owner } as OwnerId;
    const repositoryId = { ownerId, name: params.repo } as RepositoryId;
    const [owner, repository] = await githubSyncService.syncRepository(repositoryId);
    return {
      status: 200 as const,
      body: {
        owner: bridgeOwner(owner),
        repository: bridgeRepository(repository),
      },
    };
  },

  syncAll: async () => {
    const result = await githubSyncService.syncAllProjectItems();
    return {
      status: 201 as const,
      body: {
        message: `Synced ${result.syncedOwners} owners, ${result.syncedRepositories} repositories, ${result.errors} errors`,
      },
    };
  },

  syncOwner: async ({ params }) => {
    const ownerId = { login: params.owner } as OwnerId;
    const owner = await githubSyncService.syncOwner(ownerId);
    return {
      status: 201 as const,
      body: { owner: bridgeOwner(owner) },
    };
  },

  syncRepository: async ({ params }) => {
    const ownerId = { login: params.owner } as OwnerId;
    const repositoryId = { ownerId, name: params.repo } as RepositoryId;
    const [owner, repository] = await githubSyncService.syncRepository(repositoryId);
    return {
      status: 201 as const,
      body: {
        owner: bridgeOwner(owner),
        repository: bridgeRepository(repository),
      },
    };
  },

  syncProject: async ({ params }) => {
    const ownerId = { login: params.owner } as OwnerId;
    const [owner, repository] = await githubSyncService.syncProject(ownerId);
    return {
      status: 201 as const,
      body: {
        owner: bridgeOwner(owner),
        repository: repository ? bridgeRepository(repository) : null,
      },
    };
  },
});
