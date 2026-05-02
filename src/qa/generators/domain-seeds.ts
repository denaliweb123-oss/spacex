import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

// Maps Query root field name to a real seed ID from the MSW fixture dataset.
// When a seed exists for a field, the query generator substitutes the real ID
// instead of "qa-fixture-id", so the autonomous QA suite exercises the happy-path
// resolver branch (actual data returned) rather than always hitting the null/404 branch.
function loadSeeds(): Record<string, string> {
  const fixturePath = resolve(process.cwd(), 'tests/fixtures/launches.json');
  if (!existsSync(fixturePath)) return {};
  try {
    const launches: Array<{ id: string }> = JSON.parse(readFileSync(fixturePath, 'utf-8'));
    const launchId = launches[0]?.id;
    if (!launchId) return {};
    // Only launches have pinned fixture data. All other single-item resolvers
    // (capsule, rocket, ship, etc.) have no fixture entries so fall back to
    // "qa-fixture-id" which the MSW handlers return as null/404.
    return { launch: launchId };
  } catch {
    return {};
  }
}

export const DOMAIN_SEEDS: Record<string, string> = loadSeeds();
