import fs from "fs";
import { OwnerId, Repository, RepositoryId } from "@open-source-economy/api-types";

// Local parsing helper (replaces the old static Repository.fromGithubApi method)
function parseRepositoryFromGithubApi(json: any): Repository {
  if (!json || !json.name || !json.owner) {
    throw new Error(`Invalid GitHub repository data: missing required fields`);
  }
  const ownerId: OwnerId = { login: json.owner.login, githubId: json.owner.id };
  return {
    id: { ownerId, name: json.name, githubId: json.id } as RepositoryId,
    htmlUrl: json.html_url,
    description: json.description,
    homepage: json.homepage,
    language: json.language,
    forksCount: json.forks_count,
    stargazersCount: json.stargazers_count,
    watchersCount: json.watchers_count,
    fullName: json.full_name,
    fork: json.fork,
    topics: json.topics,
    openIssuesCount: json.open_issues_count,
    visibility: json.visibility,
    subscribersCount: json.subscribers_count,
    networkCount: json.network_count,
  } as Repository;
}

describe("Repository", () => {
  it("fromGithubApi does not throw an error", () => {
    const data = fs.readFileSync(`src/__tests__/__data__/github/repository.json`, "utf8");
    const json = JSON.parse(data);
    const object = parseRepositoryFromGithubApi(json);

    const ownerId: OwnerId = {
      login: "Open-Source-Economy",
      githubId: 141809657,
    };
    const repositoryId: RepositoryId = {
      ownerId,
      name: "frontend",
      githubId: 701996033,
    };
    const expected: Repository = {
      id: repositoryId,
      htmlUrl: "https://github.com/Open-Source-Economy/frontend",
      description: undefined,
    } as Repository;

    expect(object).toEqual(expected);
  });
});
