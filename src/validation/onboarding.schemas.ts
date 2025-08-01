import Joi from 'joi';

export const createProfileSchema = Joi.object({
  // All user fields (name, email, githubUsername, termsAccepted) are now in app_user
  // This schema can be empty or contain developer-specific fields if needed in the future
});

export const updateProfileSchema = Joi.object({
  // All user fields (name, email, githubUsername) are now in app_user
  // This schema can be empty or contain developer-specific fields if needed in the future
});

export const addProjectSchema = Joi.object({
  projectType: Joi.string().valid('github', 'manual').required(),
  githubOrg: Joi.when('projectType', {
    is: 'github',
    then: Joi.string().required(),
    otherwise: Joi.forbidden()
  }),
  githubRepo: Joi.when('projectType', {
    is: 'github',
    then: Joi.string().required(),
    otherwise: Joi.forbidden()
  }),
  projectName: Joi.when('projectType', {
    is: 'manual',
    then: Joi.string().min(1).max(255).required(),
    otherwise: Joi.forbidden()
  }),
  projectUrl: Joi.when('projectType', {
    is: 'manual',
    then: Joi.string().uri().max(500).required(),
    otherwise: Joi.forbidden()
  }),
  role: Joi.string().valid('creator_founder', 'project_lead', 'core_developer', 'maintainer').required(),
  mergeRights: Joi.string().valid('full_rights', 'specific_areas', 'no_rights', 'formal_process').required()
});

export const updateProjectSchema = Joi.object({
  role: Joi.string().valid('creator_founder', 'project_lead', 'core_developer', 'maintainer').optional(),
  mergeRights: Joi.string().valid('full_rights', 'specific_areas', 'no_rights', 'formal_process').optional()
});

export const setIncomePreferenceSchema = Joi.object({
  incomeType: Joi.string().valid('royalties', 'services', 'donations').required()
});

export const setAvailabilitySchema = Joi.object({
  weeklyCommitment: Joi.number().integer().min(1).max(168).required(),
  largerOpportunities: Joi.string().valid('yes', 'maybe', 'no').required(),
  hourlyRate: Joi.number().precision(2).min(0.01).max(10000).required(),
  currency: Joi.string().length(3).uppercase().required()
});

export const updateAvailabilitySchema = Joi.object({
  weeklyCommitment: Joi.number().integer().min(1).max(168).optional(),
  largerOpportunities: Joi.string().valid('yes', 'maybe', 'no').optional(),
  hourlyRate: Joi.number().precision(2).min(0.01).max(10000).optional(),
  currency: Joi.string().length(3).uppercase().optional()
});

export const addServiceSchema = Joi.object({
  serviceCategoryId: Joi.string().uuid().required(),
  serviceName: Joi.string().max(200).optional().allow(null, ''),
  hourlyRate: Joi.number().precision(2).min(0.01).max(10000).required(),
  currency: Joi.string().length(3).uppercase().required(),
  responseTimeHours: Joi.number().integer().min(1).max(8760).optional(),
  projectIds: Joi.array().items(Joi.string().uuid()).default([])
});

export const updateServiceSchema = Joi.object({
  serviceName: Joi.string().max(200).optional().allow(null, ''),
  hourlyRate: Joi.number().precision(2).min(0.01).max(10000).optional(),
  currency: Joi.string().length(3).uppercase().optional(),
  responseTimeHours: Joi.number().integer().min(1).max(8760).optional(),
  projectIds: Joi.array().items(Joi.string().uuid()).optional()
});

export const paramIdSchema = Joi.object({
  id: Joi.string().uuid().required()
});

export const githubOrgParamSchema = Joi.object({
  org: Joi.string().min(1).max(255).required()
});