import { getGraphQLRateLimiter } from 'graphql-rate-limit';
import { GraphQLResolveInfo } from 'graphql';

const rateLimiter = getGraphQLRateLimiter({
  identifyContext: (ctx) => ctx.apiKey || ctx.ip || ctx.headers?.['x-forwarded-for'] || 'anonymous',
});

/**
 * Rate limiting helper to be used at the resolver level.
 */
export async function checkRateLimit(parent: any, args: any, context: any, info: GraphQLResolveInfo) {
  const errorMessage = await rateLimiter(
    { parent, args, context, info },
    { max: 100, window: '1m' }
  );
  
  if (errorMessage) {
    throw new Error(`Query blocked by rate limit: ${errorMessage}`);
  }
}