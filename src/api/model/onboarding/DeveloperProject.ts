import { ValidationError, Validator } from "../error";
import { DeveloperProfileId } from "./DeveloperProfile";

export class DeveloperProjectId {
  uuid: string;

  constructor(uuid: string) {
    this.uuid = uuid;
  }
}

export type ProjectType = 'github' | 'manual';
export type ProjectRole = 'creator_founder' | 'project_lead' | 'core_developer' | 'maintainer';
export type MergeRights = 'full_rights' | 'specific_areas' | 'no_rights' | 'formal_process';

export class DeveloperProject {
  id: DeveloperProjectId;
  developerProfileId: DeveloperProfileId;
  projectType: ProjectType;
  githubOrg: string | null;
  githubRepo: string | null;
  projectName: string | null;
  projectUrl: string | null;
  role: ProjectRole;
  mergeRights: MergeRights;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    id: DeveloperProjectId,
    developerProfileId: DeveloperProfileId,
    projectType: ProjectType,
    githubOrg: string | null,
    githubRepo: string | null,
    projectName: string | null,
    projectUrl: string | null,
    role: ProjectRole,
    mergeRights: MergeRights,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this.id = id;
    this.developerProfileId = developerProfileId;
    this.projectType = projectType;
    this.githubOrg = githubOrg;
    this.githubRepo = githubRepo;
    this.projectName = projectName;
    this.projectUrl = projectUrl;
    this.role = role;
    this.mergeRights = mergeRights;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static fromBackend(row: any): DeveloperProject | ValidationError {
    const validator = new Validator(row);
    const id = validator.requiredString("id");
    const developerProfileId = validator.requiredString("developer_profile_id");
    const projectType = validator.requiredString("project_type") as ProjectType;
    const githubOrg = validator.optionalString("github_org");
    const githubRepo = validator.optionalString("github_repo");
    const projectName = validator.optionalString("project_name");
    const projectUrl = validator.optionalString("project_url");
    const role = validator.requiredString("role") as ProjectRole;
    const mergeRights = validator.requiredString("merge_rights") as MergeRights;
    const createdAt = validator.requiredDate("created_at");
    const updatedAt = validator.requiredDate("updated_at");

    const error = validator.getFirstError();
    if (error) {
      return error;
    }

    return new DeveloperProject(
      new DeveloperProjectId(id),
      new DeveloperProfileId(developerProfileId),
      projectType,
      githubOrg ?? null,
      githubRepo ?? null,
      projectName ?? null,
      projectUrl ?? null,
      role,
      mergeRights,
      createdAt,
      updatedAt,
    );
  }
}