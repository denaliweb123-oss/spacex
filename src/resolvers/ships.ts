import { applyLimitOffset } from "../limit-offset-service";
import { parseShip } from "../parse-service";
import { Resolvers, Ship } from "../__generated__/resolvers-types";

const resolvers: Resolvers = {
  Query: {
    ships: async (obj, { find, offset, order, sort, limit }, context) => {
      let data: any[];
      if (find) data = (await context.api.queryShips(find ?? {}))?.data ?? [];
      else data = (await context.api.getShips()) ?? [];

      const parsedData = data.filter(d => !!d).map((d: any) => parseShip(d));
      return applyLimitOffset({ data: parsedData, limit, offset });
    },
    shipsResult: async (obj, { find, offset, order, sort, limit }, context) => {
      const results = await context.api.queryShips(find ?? {});
      return {
        ...(results ?? {}),
        data: applyLimitOffset({
          data: (results?.data ?? []).filter(d => !!d).map((d: any) => parseShip(d)),
          limit,
          offset,
        }),
      };
    },
    ship: async (obj, { id }, context) => {
      const ship = await context.api.getShip(id);
      return ship ? parseShip(ship) : null;
    },
  },
};

export { resolvers };
