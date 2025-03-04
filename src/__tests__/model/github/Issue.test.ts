import fs from "fs";
import { Issue, IssueId, OwnerId, RepositoryId } from "../../../api/model";
import { logger } from "../../../config";

describe("Issue", () => {
  it("fromGithubApi does not throw an error", () => {
    const data = fs.readFileSync(
      `src/__tests__/__data__/github/issue.json`,
      "utf8",
    );

    const ownerId = new OwnerId("Open-Source-Economy", 141809657);
    const repositoryId = new RepositoryId(ownerId, "frontend", 701996033);

    const json = JSON.parse(data);
    const object = Issue.fromGithubApi(repositoryId, json);

    if (object instanceof Error) {
      logger.error(object);
    }

    const issueId = new IssueId(repositoryId, 3, 2538344642);

    const expected = new Issue(
      issueId,
      "Test issue - to be added in our unit tests",
      "https://github.com/Open-Source-Economy/frontend/issues/3",
      new Date("2024-09-20T09:34:07Z"),
      null,
      new OwnerId("LaurianeOSE", 141809342),
      undefined,
    );

    expect(object).toBeInstanceOf(Issue);
    expect(object).toEqual(expected);
  });
});
