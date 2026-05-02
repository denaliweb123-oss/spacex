import { applyLimitOffset } from "../limit-offset-service";
import { Resolvers } from "../__generated__/resolvers-types";

const resolvers: Resolvers = {
  Query: {
    capsules: async (obj, { find, offset, order, sort, limit }, context) => {
      const capsules = await context.api.getCapsules();
      return applyLimitOffset({ data: capsules, limit: limit ?? undefined, offset: offset ?? undefined });
    },
    capsulesPast: async (
      obj,
      { find, offset, order, sort, limit },
      context
    ) => {
      const capsules = await context.api.getCapsules();
      return applyLimitOffset({ data: capsules, limit: limit ?? undefined, offset: offset ?? undefined });
    },
    capsulesUpcoming: async (
      obj,
      { find, offset, order, sort, limit },
      context
    ) => {
      return [];
    },
    capsule: (obj, { id }, context) => {
      return context.api.getCapsule(id);
    },
  },
};
export { resolvers };
