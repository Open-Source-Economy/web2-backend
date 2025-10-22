import fs from "fs";
import { Owner, OwnerId, OwnerType } from "@open-source-economy/api-types";

describe("Owner", () => {
  it("fromGithubApi does not throw an error", () => {
    const data = fs.readFileSync(
      `src/__tests__/__data__/github/owner-org.json`,
      "utf8",
    );
    const json = JSON.parse(data);
    const object = Owner.fromGithubApi(json);

    const expected = new Owner(
      new OwnerId("Open-Source-Economy", 141809657),
      OwnerType.Organization,
      "https://github.com/Open-Source-Economy",
      "https://avatars.githubusercontent.com/u/141809657?v=4",
      8, // followers
      0, // following
      7, // publicRepos
      0, // publicGists
      "Open Source Economy", // name
      undefined, // twitterUsername (null in JSON becomes undefined)
      undefined, // company (null in JSON becomes undefined)
      "https://www.open-source-economy.com/", // blog
      "Switzerland", // location
      undefined, // email (null in JSON becomes undefined)
    );

    expect(object).toBeInstanceOf(Owner);
    expect(object).toEqual(expected);
  });
});
