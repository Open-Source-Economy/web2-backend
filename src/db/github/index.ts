import { getIssueRepository } from "./Issue.repository";
import { getOwnerRepository } from "./Owner.repository";
import { getRepositoryRepository } from "./Repository.repository";

export const ownerRepo = getOwnerRepository();
export const repositoryRepo = getRepositoryRepository();
export const issueRepo = getIssueRepository();
