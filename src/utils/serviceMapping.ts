import {
  AdvisorySubServiceType,
  DevelopmentSubServiceType,
  SecurityAndComplianceSubServiceType,
  ServiceType,
  SupportSubServiceType,
} from "@open-source-economy/api-types";

/**
 * Maps between existing ServiceType enums and onboarding service categories
 * This ensures consistency between the payment system and onboarding system
 */

export type AllSubServiceTypes =
  | SupportSubServiceType
  | DevelopmentSubServiceType
  | SecurityAndComplianceSubServiceType
  | AdvisorySubServiceType;

export interface ServiceCategoryMapping {
  mainCategory: ServiceType;
  subCategory?: AllSubServiceTypes;
  categoryName: string;
  hasResponseTime: boolean;
}

/**
 * Complete mapping between ServiceType enums and database service categories
 */
export const SERVICE_CATEGORY_MAPPINGS: ServiceCategoryMapping[] = [
  // Main categories
  {
    mainCategory: ServiceType.SUPPORT,
    categoryName: "Support",
    hasResponseTime: true,
  },
  {
    mainCategory: ServiceType.DEVELOPMENT,
    categoryName: "Development",
    hasResponseTime: true,
  },
  {
    mainCategory: ServiceType.SECURITY_AND_COMPLIANCE, // TODO: lolo
    categoryName: "Operation",
    hasResponseTime: true,
  },
  {
    mainCategory: ServiceType.ADVISORY,
    categoryName: "Advisory",
    hasResponseTime: false,
  },

  // Support subcategories
  {
    mainCategory: ServiceType.SUPPORT,
    subCategory: SupportSubServiceType.BUG_FIXES,
    categoryName: "Bug Fixes",
    hasResponseTime: true,
  },
  {
    mainCategory: ServiceType.SUPPORT,
    subCategory: SupportSubServiceType.NEW_FEATURES,
    categoryName: "New Features",
    hasResponseTime: true,
  },
  {
    mainCategory: ServiceType.SUPPORT,
    subCategory: SupportSubServiceType.CODE_MAINTENANCE,
    categoryName: "Code Maintenance",
    hasResponseTime: true,
  },

  // Development subcategories
  {
    mainCategory: ServiceType.DEVELOPMENT,
    subCategory: DevelopmentSubServiceType.TECHNICAL_ASSISTANCE,
    categoryName: "Technical Assistance",
    hasResponseTime: true,
  },
  {
    mainCategory: ServiceType.DEVELOPMENT,
    subCategory: DevelopmentSubServiceType.DEPLOYMENT_GUIDANCE,
    categoryName: "Deployment Guidance",
    hasResponseTime: true,
  },
  {
    mainCategory: ServiceType.DEVELOPMENT,
    subCategory: DevelopmentSubServiceType.CUSTOMER_SUPPORT,
    categoryName: "Customer Support",
    hasResponseTime: true,
  },

  // Operation subcategories
  {
    mainCategory: ServiceType.SECURITY_AND_COMPLIANCE, // TODO: lolo
    subCategory: SecurityAndComplianceSubServiceType.INCIDENT_RESPONSE,
    categoryName: "Incident Response",
    hasResponseTime: true,
  },
  {
    mainCategory: ServiceType.SECURITY_AND_COMPLIANCE, // TODO: lolo
    subCategory: SecurityAndComplianceSubServiceType.PROACTIVE_MAINTENANCE,
    categoryName: "Proactive Monitoring",
    hasResponseTime: true,
  },
  {
    mainCategory: ServiceType.SECURITY_AND_COMPLIANCE, // TODO: lolo
    subCategory: SecurityAndComplianceSubServiceType.SUPERVISION,
    categoryName: "24/7 Supervision",
    hasResponseTime: true,
  },

  // Advisory subcategories
  {
    mainCategory: ServiceType.ADVISORY,
    subCategory: AdvisorySubServiceType.ARCHITECTURE_DESIGN,
    categoryName: "Architecture Design",
    hasResponseTime: false,
  },
  {
    mainCategory: ServiceType.ADVISORY,
    subCategory: AdvisorySubServiceType.TECHNOLOGY_ASSESSMENT,
    categoryName: "Technology Assessment",
    hasResponseTime: false,
  },
  {
    mainCategory: ServiceType.ADVISORY,
    subCategory: AdvisorySubServiceType.SECURITY_PERFORMANCE,
    categoryName: "Security & Performance",
    hasResponseTime: false,
  },
];

/**
 * Get ServiceType enum from category name
 */
export function getServiceTypeFromCategory(
  categoryName: string,
): ServiceType | null {
  const mapping = SERVICE_CATEGORY_MAPPINGS.find(
    (m) => m.categoryName === categoryName && !m.subCategory,
  );
  return mapping?.mainCategory || null;
}

/**
 * Get sub-service enum from category name
 */
export function getSubServiceTypeFromCategory(
  categoryName: string,
): AllSubServiceTypes | null {
  const mapping = SERVICE_CATEGORY_MAPPINGS.find(
    (m) => m.categoryName === categoryName && m.subCategory,
  );
  return mapping?.subCategory || null;
}

/**
 * Get category name from ServiceType and optional sub-service
 */
export function getCategoryNameFromServiceType(
  serviceType: ServiceType,
  subServiceType?: AllSubServiceTypes,
): string | null {
  const mapping = SERVICE_CATEGORY_MAPPINGS.find(
    (m) =>
      m.mainCategory === serviceType &&
      (subServiceType ? m.subCategory === subServiceType : !m.subCategory),
  );
  return mapping?.categoryName || null;
}

/**
 * Validate that a service category exists in our mappings
 */
export function isValidServiceCategory(categoryName: string): boolean {
  return SERVICE_CATEGORY_MAPPINGS.some((m) => m.categoryName === categoryName);
}

/**
 * Get all main service categories
 */
export function getMainServiceCategories(): string[] {
  return SERVICE_CATEGORY_MAPPINGS.filter((m) => !m.subCategory).map(
    (m) => m.categoryName,
  );
}

/**
 * Get subcategories for a main category
 */
export function getSubCategories(mainCategoryName: string): string[] {
  const serviceType = getServiceTypeFromCategory(mainCategoryName);
  if (!serviceType) return [];

  return SERVICE_CATEGORY_MAPPINGS.filter(
    (m) => m.mainCategory === serviceType && m.subCategory,
  ).map((m) => m.categoryName);
}
