import { s } from "../../ts-rest";
import { contract } from "@open-source-economy/api-types";
import { planAndCreditsRepo, userRepo } from "../../db/";
import type { CompanyId } from "@open-source-economy/api-types";
import type { Currency } from "@open-source-economy/api-types";
import { requireAuth, getAuthUser } from "../../middlewares/auth/ts-rest-auth";

export const usersRouter = s.router(contract.users, {
  getAvailableCredits: {
    middleware: [requireAuth],
    handler: async ({ query, req }) => {
      const user = getAuthUser(req);
      const userId = user.id;
      const companyId = query.companyId ? (query.companyId as CompanyId) : undefined;

      const creditAmount = await planAndCreditsRepo.getAvailableCredit(userId as any, companyId);

      return {
        status: 200 as const,
        body: { creditAmount },
      };
    },
  },

  getUserPlan: {
    middleware: [requireAuth],
    handler: async ({ query, req }) => {
      const user = getAuthUser(req);
      const userId = user.id;
      const companyId = query.companyId ? (query.companyId as CompanyId) : undefined;

      const types = await planAndCreditsRepo.getPlan(userId as any, companyId);

      return {
        status: 200 as const,
        body: {
          productType: types ? types[0] : null,
          priceType: types ? types[1] : null,
        },
      };
    },
  },

  setPreferredCurrency: {
    middleware: [requireAuth],
    handler: async ({ params, req }) => {
      const user = getAuthUser(req);
      const userId = user.id;
      const currency = params.currency as Currency;

      await userRepo.setPreferredCurrency(userId as any, currency as any);

      return { status: 201 as const, body: {} };
    },
  },
});
