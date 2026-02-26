/**
 * Temporary bridge utilities to convert old @open-source-economy/api-types classes
 * to new @open-source-economy/api-types interfaces.
 *
 * Since both packages now use the same interface-based types (after the api-types
 * migration from classes to interfaces), most bridge functions are now identity
 * functions or very thin wrappers. They will be removed once Phase 2
 * (repository migration) is complete and services return new types directly.
 */

import type {
  Owner as NewOwner,
  Repository as NewRepository,
  Issue as NewIssue,
  OwnerId as NewOwnerId,
  RepositoryId as NewRepositoryId,
  IssueId as NewIssueId,
  IssueFunding as NewIssueFunding,
  ManagedIssue as NewManagedIssue,
  FinancialIssue as NewFinancialIssue,
  Project as NewProject,
  User as NewUser,
  UserId as NewUserId,
} from "@open-source-economy/api-types";

import {
  Owner as OldOwner,
  Repository as OldRepository,
  Issue as OldIssue,
  OwnerId as OldOwnerId,
  RepositoryId as OldRepositoryId,
  IssueId as OldIssueId,
  IssueFunding as OldIssueFunding,
  ManagedIssue as OldManagedIssue,
  FinancialIssue as OldFinancialIssue,
  Project as OldProject,
  User as OldUser,
} from "@open-source-economy/api-types";

// Both packages now have the same OwnerId interface { login, githubId? }
export function bridgeOwnerId(old: OldOwnerId): NewOwnerId {
  return old as unknown as NewOwnerId;
}

export function bridgeRepositoryId(old: OldRepositoryId): NewRepositoryId {
  return {
    ownerId: bridgeOwnerId(old.ownerId),
    name: old.name,
    githubId: old.githubId,
  };
}

export function bridgeIssueId(old: OldIssueId): NewIssueId {
  return {
    repositoryId: bridgeRepositoryId(old.repositoryId),
    number: old.number,
    githubId: old.githubId,
  };
}

export function bridgeOwner(old: OldOwner): NewOwner {
  return {
    id: bridgeOwnerId(old.id),
    type: old.type as string as NewOwner["type"],
    htmlUrl: old.htmlUrl,
    avatarUrl: old.avatarUrl,
    followers: old.followers,
    following: old.following,
    publicRepos: old.publicRepos,
    publicGists: old.publicGists,
    name: old.name,
    twitterUsername: old.twitterUsername,
    company: old.company,
    blog: old.blog,
    location: old.location,
    email: old.email,
  };
}

export function bridgeRepository(old: OldRepository): NewRepository {
  return {
    id: bridgeRepositoryId(old.id),
    htmlUrl: old.htmlUrl,
    description: old.description,
    homepage: old.homepage,
    language: old.language,
    forksCount: old.forksCount,
    stargazersCount: old.stargazersCount,
    watchersCount: old.watchersCount,
    fullName: old.fullName,
    fork: old.fork,
    topics: old.topics,
    openIssuesCount: old.openIssuesCount,
    visibility: old.visibility,
    subscribersCount: old.subscribersCount,
    networkCount: old.networkCount,
  };
}

export function bridgeIssue(old: OldIssue): NewIssue {
  return {
    id: bridgeIssueId(old.id),
    title: old.title,
    htmlUrl: old.htmlUrl,
    // createdAt and closedAt are now ISODateTimeString in both packages
    createdAt: old.createdAt as unknown as NewIssue["createdAt"],
    closedAt: old.closedAt as unknown as NewIssue["closedAt"],
    openBy: bridgeOwnerId(old.openBy),
    body: old.body,
  };
}

export function bridgeIssueFunding(old: OldIssueFunding): NewIssueFunding {
  return {
    // Branded IDs are now just strings; use the value directly (no .uuid)
    id: old.id as unknown as NewIssueFunding["id"],
    githubIssueId: bridgeIssueId(old.githubIssueId),
    userId: old.userId as unknown as NewUserId,
    credit: old.credit,
  };
}

export function bridgeManagedIssue(old: OldManagedIssue): NewManagedIssue {
  return {
    id: old.id as unknown as NewManagedIssue["id"],
    githubIssueId: bridgeIssueId(old.githubIssueId),
    requestedCreditAmount: old.requestedCreditAmount,
    managerId: old.managerId as unknown as NewUserId,
    contributorVisibility:
      old.contributorVisibility as string as NewManagedIssue["contributorVisibility"],
    state: old.state as string as NewManagedIssue["state"],
  };
}

export function bridgeFinancialIssue(
  old: OldFinancialIssue,
): NewFinancialIssue {
  return {
    owner: bridgeOwner(old.owner),
    repository: bridgeRepository(old.repository),
    issue: bridgeIssue(old.issue),
    managedIssue: old.managedIssue
      ? bridgeManagedIssue(old.managedIssue)
      : undefined,
    issueFundings: old.issueFundings.map(bridgeIssueFunding),
  };
}

export function bridgeProject(old: OldProject): NewProject {
  return {
    owner: bridgeOwner(old.owner),
    repository: old.repository ? bridgeRepository(old.repository) : undefined,
  };
}

export function bridgeUser(old: OldUser): NewUser {
  return {
    // UserId is now a branded string; use value directly (no .uuid)
    id: old.id as unknown as NewUserId,
    name: old.name,
    role: old.role as string as NewUser["role"],
    preferredCurrency:
      old.preferredCurrency as string as NewUser["preferredCurrency"],
    termsAcceptedVersion: old.termsAcceptedVersion,
  };
}
