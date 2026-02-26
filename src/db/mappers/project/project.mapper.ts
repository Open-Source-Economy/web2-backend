import type { Project, Repository } from "@open-source-economy/api-types";
import { mapOwnerFromRow } from "../github/owner.mapper";
import { mapRepositoryFromRow } from "../github/repository.mapper";

export function mapProjectFromRow(
  row: Record<string, any>,
  ownerPrefix: string,
  repositoryPrefix: string,
): Project {
  const owner = mapOwnerFromRow(row, ownerPrefix);

  let repository: Repository | undefined;
  try {
    repository = mapRepositoryFromRow(row, repositoryPrefix);
  } catch {
    // Repository data may not be present
  }

  return { owner, repository };
}
