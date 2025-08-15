import Joi from "joi";

export const createProfileSchema = Joi.object({
  // User fields that can be updated during profile creation
  name: Joi.string().min(1).max(255).optional().allow(null),
  email: Joi.string().email().max(255).optional().allow(null),
  agreedToTerms: Joi.boolean().optional(),
  onboardingCompleted: Joi.boolean().optional(),
});

export const updateProfileSchema = Joi.object({
  // User fields that can be updated during profile updates
  name: Joi.string().min(1).max(255).optional().allow(null),
  email: Joi.string().email().max(255).optional().allow(null),
  agreedToTerms: Joi.boolean().optional(),
  onboardingCompleted: Joi.boolean().optional(),
});

export const setIncomeStreamsSchema = Joi.object({
  incomeStreams: Joi.array()
    .items(Joi.string().valid("royalties", "services", "donations"))
    .min(1)
    .required(),
});

export const setDeveloperSettingsSchema = Joi.object({
  incomeStreams: Joi.array()
    .items(Joi.string().valid("royalties", "services", "donations"))
    .min(1)
    .required(),
  hourlyWeeklyCommitment: Joi.number().integer().min(1).max(168).required(),
  openToOtherOpportunity: Joi.string().valid("yes", "maybe", "no").required(),
  hourlyRate: Joi.number().precision(2).min(0).max(10000).required(),
  currency: Joi.string().valid("USD", "EUR", "GBP", "CHF").required(),
});

export const addRepositorySchema = Joi.object({
  githubOwnerId: Joi.number().integer().required(),
  githubOwnerLogin: Joi.string().min(1).max(255).required(),
  githubRepositoryId: Joi.number().integer().required(),
  githubRepositoryName: Joi.string().min(1).max(255).required(),
  mergeRights: Joi.array()
    .items(Joi.string().valid("full_rights", "no_rights", "formal_process"))
    .min(1)
    .required(),
  roles: Joi.array()
    .items(
      Joi.string().valid(
        "creator_founder",
        "project_lead",
        "core_developer",
        "maintainer",
      ),
    )
    .min(1)
    .required(),
  services: Joi.array()
    .items(
      Joi.object({
        serviceId: Joi.string().uuid().required(),
        hourlyRate: Joi.number().precision(2).min(0).max(10000).required(),
        currency: Joi.string().valid("USD", "EUR", "GBP", "CHF").required(),
        responseTimeHours: Joi.number()
          .integer()
          .min(1)
          .max(8760)
          .optional()
          .allow(null),
      }),
    )
    .optional(),
});

export const updateDeveloperRightsSchema = Joi.object({
  mergeRights: Joi.array()
    .items(Joi.string().valid("full_rights", "no_rights", "formal_process"))
    .min(1)
    .optional(),
  roles: Joi.array()
    .items(
      Joi.string().valid(
        "creator_founder",
        "project_lead",
        "core_developer",
        "maintainer",
      ),
    )
    .min(1)
    .optional(),
});

export const createCustomServiceSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  hasResponseTime: Joi.boolean().optional().default(false),
});

export const addDeveloperServiceSchema = Joi.object({
  projectItemId: Joi.string().uuid().required(),
  serviceId: Joi.string().uuid().required(),
  hourlyRate: Joi.number().precision(2).min(0).max(10000).required(),
  currency: Joi.string().valid("USD", "EUR", "GBP", "CHF").required(),
  responseTimeHours: Joi.number()
    .integer()
    .min(1)
    .max(8760)
    .optional()
    .allow(null),
});

export const updateDeveloperServiceSchema = Joi.object({
  hourlyRate: Joi.number().precision(2).min(0).max(10000).required(),
  currency: Joi.string().valid("USD", "EUR", "GBP", "CHF").required(),
  responseTimeHours: Joi.number()
    .integer()
    .min(1)
    .max(8760)
    .optional()
    .allow(null),
});

export const paramIdSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const projectItemIdParamSchema = Joi.object({
  projectItemId: Joi.string().uuid().required(),
});

export const githubOrgParamSchema = Joi.object({
  org: Joi.string().min(1).max(255).required(),
});

// Legacy schemas - to be removed after migration
export const addProjectSchema = Joi.object({
  projectType: Joi.string().valid("github", "manual").required(),
  githubOrg: Joi.when("projectType", {
    is: "github",
    then: Joi.string().required(),
    otherwise: Joi.forbidden(),
  }),
  githubRepo: Joi.when("projectType", {
    is: "github",
    then: Joi.string().required(),
    otherwise: Joi.forbidden(),
  }),
  projectName: Joi.when("projectType", {
    is: "manual",
    then: Joi.string().min(1).max(255).required(),
    otherwise: Joi.forbidden(),
  }),
  projectUrl: Joi.when("projectType", {
    is: "manual",
    then: Joi.string().uri().max(500).required(),
    otherwise: Joi.forbidden(),
  }),
  role: Joi.string()
    .valid("creator_founder", "project_lead", "core_developer", "maintainer")
    .required(),
  mergeRights: Joi.string()
    .valid("full_rights", "specific_areas", "no_rights", "formal_process")
    .required(),
});

export const updateProjectSchema = Joi.object({
  role: Joi.string()
    .valid("creator_founder", "project_lead", "core_developer", "maintainer")
    .optional(),
  mergeRights: Joi.string()
    .valid("full_rights", "specific_areas", "no_rights", "formal_process")
    .optional(),
});

export const setIncomePreferenceSchema = Joi.object({
  incomeType: Joi.string()
    .valid("royalties", "services", "donations")
    .required(),
});

export const setAvailabilitySchema = Joi.object({
  weeklyCommitment: Joi.number().integer().min(1).max(168).required(),
  largerOpportunities: Joi.string().valid("yes", "maybe", "no").required(),
  hourlyRate: Joi.number().precision(2).min(0.01).max(10000).required(),
  currency: Joi.string().length(3).uppercase().required(),
});

export const updateAvailabilitySchema = Joi.object({
  weeklyCommitment: Joi.number().integer().min(1).max(168).optional(),
  largerOpportunities: Joi.string().valid("yes", "maybe", "no").optional(),
  hourlyRate: Joi.number().precision(2).min(0.01).max(10000).optional(),
  currency: Joi.string().length(3).uppercase().optional(),
});

export const addServiceSchema = Joi.object({
  serviceCategoryId: Joi.string().uuid().required(),
  serviceName: Joi.string().max(200).optional().allow(null, ""),
  hourlyRate: Joi.number().precision(2).min(0.01).max(10000).required(),
  currency: Joi.string().length(3).uppercase().required(),
  responseTimeHours: Joi.number().integer().min(1).max(8760).optional(),
  projectIds: Joi.array().items(Joi.string().uuid()).default([]),
});

export const updateServiceSchema = Joi.object({
  serviceName: Joi.string().max(200).optional().allow(null, ""),
  hourlyRate: Joi.number().precision(2).min(0.01).max(10000).optional(),
  currency: Joi.string().length(3).uppercase().optional(),
  responseTimeHours: Joi.number().integer().min(1).max(8760).optional(),
  projectIds: Joi.array().items(Joi.string().uuid()).optional(),
});
