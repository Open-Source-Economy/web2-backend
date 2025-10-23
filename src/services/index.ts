import { CurrencyApi, getCurrencyAPI } from "./currency.service";
import { MailService } from "./mail.service";
import { getGithubSyncService, GithubSyncService } from "./sync.service";
import { getGitHubAPI } from "./github.service";
import { ownerRepo, projectRepo, repositoryRepo, projectItemRepo } from "../db";

export * from "./github.service";
export * from "./currency.service";
export * from "./sync.service";

export const currencyAPI: CurrencyApi = getCurrencyAPI();
export const mailService = new MailService();
export const githubService = getGitHubAPI();
export const githubSyncService: GithubSyncService = getGithubSyncService(
  githubService,
  ownerRepo,
  repositoryRepo,
  projectRepo,
  projectItemRepo,
);
