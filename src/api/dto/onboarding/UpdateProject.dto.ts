export interface UpdateProjectDto {
  role?:
    | "creator_founder"
    | "core_developer"
    | "active_contributor"
    | "occasional_contributor";
  mergeRights?: "full_rights" | "specific_areas" | "no_rights";
  projectName?: string;
  projectUrl?: string;
}
