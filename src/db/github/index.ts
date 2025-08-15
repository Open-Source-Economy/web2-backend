import { getIssueRepository } from "./Issue.repository";
import { getOwnerRepository } from "./Owner.repository";
import { getRepositoryRepository } from "./Repository.repository";

export const ownerRepo = getOwnerRepository();
export const repositoryRepo = getRepositoryRepository();
export const issueRepo = getIssueRepository();

// Export repository functions
export { getOwnerRepository } from "./Owner.repository";
export { getIssueRepository } from "./Issue.repository";
export { getRepositoryRepository } from "./Repository.repository";
