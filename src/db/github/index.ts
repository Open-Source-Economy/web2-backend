import { getIssueRepository } from "./Issue.repository";
import { getOwnerRepository } from "./Owner.repository";
import { getRepositoryRepository } from "./Repository.repository";

export * from "./Owner.repository";
export * from "./Repository.repository";
export * from "./Issue.repository";

export const ownerRepository = getOwnerRepository();
export const repositoryRepository = getRepositoryRepository();
export const issueRepository = getIssueRepository();
