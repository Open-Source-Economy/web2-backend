import fs from "fs";
import { OwnerId, Repository, RepositoryId } from "../../../model";

describe("Repository", () => {
  it("fromGithubApi does not throw an error", () => {
    const data = fs.readFileSync(
      `src/__tests__/model/github/repository.json`,
      "utf8",
    );
    const json = JSON.parse(data);
    const object = Repository.fromGithubApi(json);

    if (object instanceof Error) {
      console.error(object);
    } else {
      console.log(object);
    }

    const ownerId = new OwnerId("Open-Source-Economy", 141809657);
    const repositoryId = new RepositoryId(ownerId, "frontend", 701996033);
    const expected = new Repository(
      repositoryId,
      "https://github.com/Open-Source-Economy/frontend",
      undefined,
    );

    expect(object).toBeInstanceOf(Repository);
    expect(object).toEqual(expected);
  });
});
