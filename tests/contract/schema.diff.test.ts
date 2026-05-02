import { buildASTSchema, parse, printSchema } from 'graphql';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { diff, CriticalityLevel } from '@graphql-inspector/core';

// Mirrors scripts/strip-federation.js — removes @link, @contact, and `extend schema`
// blocks that plain buildASTSchema cannot parse.
function stripFederation(sdl: string): string {
  let s = sdl;
  s = s.replace(/directive\s+@(?:contact|link)\b[\s\S]*?\bon\s+\w+(?:\s*\|\s*\w+)*\s*\n/g, '');
  s = s.replace(/extend\s+schema[\s\S]*?(?=\n(?:type|interface|union|enum|scalar|input|directive)\s)/g, '');
  s = s.replace(/@key\s*\([^)]*\)/g, '');
  s = s.replace(/@contact\s*\([^)]*\)/g, '');
  s = s.replace(/\n{3,}/g, '\n\n').trim() + '\n';
  return s;
}

describe('Contract: Schema Diff', () => {
  const currentSDL = stripFederation(readFileSync('schema.graphql', 'utf-8'));
  const currentSchema = buildASTSchema(parse(currentSDL));

  // Snapshot gate: any change to schema.graphql (additive or breaking) fails this test.
  // Intentional schema changes require: npx jest --updateSnapshot tests/contract/schema.diff.test.ts
  it('schema SDL matches committed snapshot', () => {
    expect(printSchema(currentSchema)).toMatchSnapshot();
  });

  // Breaking-change gate: diffs current schema against origin/main using graphql-inspector.
  // This mirrors the CI `graphql-inspector diff` step so it can also run locally.
  // Skipped gracefully when origin/main is not available (e.g., offline or fresh clone).
  it('introduces no breaking changes relative to origin/main', async () => {
    let baselineSDL: string | null = null;
    try {
      baselineSDL = execSync('git show origin/main:schema.graphql', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch {
      console.warn('  [skip] origin/main:schema.graphql not available — breaking-change gate skipped locally');
      return;
    }

    const baseline = buildASTSchema(parse(stripFederation(baselineSDL)));
    const changes = await diff(baseline, currentSchema);
    const breaking = changes.filter((c: any) => c.criticality.level === CriticalityLevel.Breaking);

    if (breaking.length > 0) {
      const details = breaking.map((c: any) => `  BREAKING: ${c.message}`).join('\n');
      throw new Error(`${breaking.length} breaking schema change(s) detected relative to origin/main:\n${details}`);
    }

    expect(breaking).toHaveLength(0);
  });
});
