import fs from "fs";
import { Owner, OwnerId, OwnerType } from "@open-source-economy/api-types";

// Local parsing helper (replaces the old static Owner.fromGithubApi method)
function parseOwnerFromGithubApi(json: any): Owner {
  if (!json || !json.login) {
    throw new Error(`Invalid GitHub owner data: missing login field`);
  }
  return {
    id: { login: json.login, githubId: json.id } as OwnerId,
    type: json.type === "Organization" ? OwnerType.Organization : OwnerType.User,
    htmlUrl: json.html_url,
    avatarUrl: json.avatar_url,
    followers: json.followers,
    following: json.following,
    publicRepos: json.public_repos,
    publicGists: json.public_gists,
    name: json.name,
    twitterUsername: json.twitter_username,
    company: json.company,
    blog: json.website_url ?? json.blog,
    location: json.location,
    email: json.email,
  } as Owner;
}

describe("Owner", () => {
  it("fromGithubApi does not throw an error", () => {
    const data = fs.readFileSync(`src/__tests__/__data__/github/owner-org.json`, "utf8");
    const json = JSON.parse(data);
    const object = parseOwnerFromGithubApi(json);

    const expected: Owner = {
      id: { login: "Open-Source-Economy", githubId: 141809657 } as OwnerId,
      type: OwnerType.Organization,
      htmlUrl: "https://github.com/Open-Source-Economy",
      avatarUrl: "https://avatars.githubusercontent.com/u/141809657?v=4",
      followers: 8,
      following: 0,
      publicRepos: 7,
      publicGists: 0,
      name: "Open Source Economy",
      twitterUsername: undefined,
      company: undefined,
      blog: "https://www.open-source-economy.com/",
      location: "Switzerland",
      email: undefined,
    } as Owner;

    expect(object).toEqual(expected);
  });
});
