import fs from "fs";
import { Issue, ISODateTimeString, IssueId, OwnerId, RepositoryId } from "@open-source-economy/api-types";

// Local parsing helper (replaces the old static Issue.fromGithubApi method)
function parseIssueFromGithubApi(repositoryId: RepositoryId, json: any): Issue {
  if (!json || json.number == null) {
    throw new Error(`Invalid GitHub issue data: missing required fields`);
  }
  return {
    id: { repositoryId, number: json.number, githubId: json.id } as IssueId,
    title: json.title,
    htmlUrl: json.html_url,
    createdAt: json.created_at as ISODateTimeString,
    closedAt: json.closed_at ? (json.closed_at as ISODateTimeString) : null,
    openBy: { login: json.user?.login, githubId: json.user?.id } as OwnerId,
    body: json.body,
  } as Issue;
}

describe("Issue", () => {
  it("fromGithubApi does not throw an error", () => {
    const data = fs.readFileSync(`src/__tests__/__data__/github/issue.json`, "utf8");

    const ownerId: OwnerId = {
      login: "Open-Source-Economy",
      githubId: 141809657,
    };
    const repositoryId: RepositoryId = {
      ownerId,
      name: "frontend",
      githubId: 701996033,
    };

    const json = JSON.parse(data);
    const object = parseIssueFromGithubApi(repositoryId, json);

    const issueId: IssueId = { repositoryId, number: 3, githubId: 2538344642 };

    const expected: Issue = {
      id: issueId,
      title: "Test issue - to be added in our unit tests",
      htmlUrl: "https://github.com/Open-Source-Economy/frontend/issues/3",
      createdAt: "2024-09-20T09:34:07Z" as ISODateTimeString,
      closedAt: null,
      openBy: { login: "LaurianeOSE", githubId: 141809342 } as OwnerId,
      body: undefined,
    } as Issue;

    expect(object).toEqual(expected);
  });
});
