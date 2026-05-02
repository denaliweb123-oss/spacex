import { applyLimitOffset } from "../limit-offset-service";
import { Resolvers } from "../__generated__/resolvers-types";

const resolvers: Resolvers = {
  Query: {
    cores: async (obj, { find, offset, order, sort, limit }, context) => {
      const cores = await context.api.getCores();
      return applyLimitOffset({ data: cores, limit: limit ?? undefined, offset: offset ?? undefined });
    },
    coresPast: async (obj, { find, offset, order, sort, limit }, context) => {
      const cores = await context.api.getCores();
      return applyLimitOffset({ data: cores, limit: limit ?? undefined, offset: offset ?? undefined });
    },
    coresUpcoming: async (
      obj,
      { find, offset, order, sort, limit },
      context
    ) => {
      return [];
    },
    core: async (obj, { id }, context) => {
      return await context.api.getCore(id);
    },
  },
};

export { resolvers };
