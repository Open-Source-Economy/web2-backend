export enum DeveloperRoleType {
  CREATOR_FOUNDER = "creator_founder",
  PROJECT_LEAD = "project_lead",
  CORE_DEVELOPER = "core_developer",
  MAINTAINER = "maintainer",
}

export enum MergeRightsType {
  FULL_RIGHTS = "full_rights",
  NO_RIGHTS = "no_rights",
  FORMAL_PROCESS = "formal_process",
}

export class DeveloperRights {
  id!: string;
  developerProfileId!: string;
  projectItemId!: string;
  mergeRights!: MergeRightsType[];
  roles!: DeveloperRoleType[];
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<DeveloperRights>) {
    Object.assign(this, partial);
  }
}
