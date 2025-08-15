export interface UpdateProjectDto {
  role?: "creator_founder" | "project_lead" | "core_developer" | "maintainer";
  mergeRights?:
    | "full_rights"
    | "specific_areas"
    | "no_rights"
    | "formal_process";
  projectName?: string;
  projectUrl?: string;
}
