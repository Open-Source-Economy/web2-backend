import {
  getIssueRepository,
  getOwnerRepository,
  getRepositoryRepository,
} from "../../../db";

export * from "./";

export const ownerRepo = getOwnerRepository();
export const repoRepo = getRepositoryRepository();
export const issueRepo = getIssueRepository();
