import fs from "fs";
import { Owner, OwnerId, OwnerType } from "../../../api/model";

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
    );

    expect(object).toBeInstanceOf(Owner);
    expect(object).toEqual(expected);
  });
});
