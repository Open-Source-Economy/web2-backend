import { getProjectRepository } from "./Project.repository";
import { getProjectItemRepository } from "./ProjectItem.repository";

export const projectRepo = getProjectRepository();
export const projectItemRepo = getProjectItemRepository();
export const servicesRepo = getProjectItemRepository();

export * from "./Project.repository";
export * from "./ProjectItem.repository";
export * from "./Service.repository";
