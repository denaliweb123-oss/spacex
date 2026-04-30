import { applyLimitOffset } from "../limit-offset-service";
import { parsePayloadObj } from "../parse-service";
import { Payload, Resolvers } from "../__generated__/resolvers-types";

const resolvers: Resolvers = {
  Query: {
    payloads: async (obj, { find, offset, order, sort, limit }, context) => {
      let payloads: Array<Payload>;
      if (find) payloads = await context.api.queryPayloads(find ?? {});
      else payloads = await context.api.getPayloads();

      return applyLimitOffset({
        data: payloads.map(p => parsePayloadObj(p)),
        limit,
        offset,
      });
    },
    payload: async (obj, { id }, context) => {
      const payload = await context.api.getPayload(id);
      return payload ? parsePayloadObj(payload) : null;
    },
  },
  Mission: {
    payloads: async (parent, args, context) => {
      const payloadIds = (parent as any)?.payload_ids;
      if (payloadIds && Array.isArray(payloadIds)) {
        return Promise.all(payloadIds.map(async (payload_id: string) => {
          const payload = await context.api.getPayload(payload_id);
          return parsePayloadObj(payload);
        }));
      }
      return null;
    }
  }
};

export { resolvers };
