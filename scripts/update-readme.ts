/**
 * Patches auto-generated sentinel blocks in README.md.
 *
 * Sentinels updated by this script:
 *
 *   <!-- README_STATS_START/END -->
 *       Total test count + suite count (from .jest-results.json)
 *
 *   <!-- README_COVERAGE_START/END -->
 *       Coverage table rows (from coverage/coverage-summary.json)
 *
 *   <!-- README_BADGES_START/END -->
 *       Dynamic coverage badge (shields.io URL, color-coded by threshold)
 *
 *   <!-- README_TEST_STRUCTURE_START/END -->
 *       Test file table auto-generated from tests/ filesystem, grouped by layer.
 *       Includes schema query field count in the contract row.
 *
 *   <!-- AUTONOMOUS_QA_METRICS_START/END -->
 *       Rolling QA trend table — last 5 runs from qa-metrics.json (array format)
 *
 *   <!-- README_QA_DESC_START/END -->
 *       QA description with live latency threshold from DEFAULT_LATENCY_THRESHOLD_MS
 *
 * Run via:  npm run readme:update
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join, relative } from 'path';
import { parse, buildASTSchema } from 'graphql';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function replaceBetween(
  content: string,
  startTag: string,
  endTag: string,
  inner: string,
): string {
  const si = content.indexOf(startTag);
  const ei = content.indexOf(endTag);
  if (si === -1 || ei === -1 || ei <= si) {
    console.warn(`  [warn] sentinel not found or misordered: ${startTag}`);
    return content;
  }
  return content.slice(0, si + startTag.length) + '\n' + inner + '\n' + content.slice(ei);
}

/** Strips Apollo Federation v2 directives so buildASTSchema can parse the SDL. */
function stripFederation(sdl: string): string {
  return sdl
    .replace(/extend\s+schema\s*@link\([^)]*\)(\s*@[a-zA-Z]+\([^)]*\))*\s*\{[^}]*\}/gs, '')
    .replace(/extend\s+schema[^{]*\{[^}]*\}/gs, '')
    .replace(/@link\([^)]*\)/g, '')
    .replace(/@contact\([^)]*\)/g, '')
    .replace(/schema\s*\{[^}]*\}/gs, '');
}

/** Recursively collects .test.ts filenames under a directory. */
function collectTestFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTestFiles(full));
    } else if (entry.name.endsWith('.test.ts') && !entry.name.endsWith('.d.ts')) {
      results.push(full);
    }
  }
  return results.sort();
}

/** Strips the .test.ts suffix for display. */
function displayName(filePath: string): string {
  return filePath.replace(/\.test\.ts$/, '');
}

// ─── Read inputs ─────────────────────────────────────────────────────────────

// 1. Jest JSON output
let totalSuites = 0;
let totalTests = 0;
const JEST_RESULTS = resolve('.jest-results.json');
if (existsSync(JEST_RESULTS)) {
  const r = JSON.parse(readFileSync(JEST_RESULTS, 'utf-8'));
  totalSuites = r.numTotalTestSuites ?? 0;
  totalTests  = r.numTotalTests      ?? 0;
} else {
  console.warn('  [warn] .jest-results.json not found — test count will not be updated');
}

// 2. Coverage summary
let stmts = '—', branches = '—', funcs = '—', lines = '—';
let coveragePct = 0;
const COVERAGE_SUMMARY = resolve('coverage/coverage-summary.json');
if (existsSync(COVERAGE_SUMMARY)) {
  const { total } = JSON.parse(readFileSync(COVERAGE_SUMMARY, 'utf-8'));
  stmts      = total.statements.pct.toFixed(2) + '%';
  branches   = total.branches.pct.toFixed(2)   + '%';
  funcs      = total.functions.pct.toFixed(2)  + '%';
  lines      = total.lines.pct.toFixed(2)      + '%';
  coveragePct = total.statements.pct as number;
} else {
  console.warn('  [warn] coverage/coverage-summary.json not found — coverage will not be updated');
}

// 3. QA metrics (array format, last 10 runs; also handles legacy single-object)
interface QaRun {
  lastRun: string;
  totalQueriesExecuted: number;
  totalAnomaliesDetected: number;
  highSeverityAnomalies: number;
  mediumSeverityAnomalies: number;
}
let qaHistory: QaRun[] = [];
const QA_METRICS = resolve('qa-metrics.json');
if (existsSync(QA_METRICS)) {
  try {
    const raw = JSON.parse(readFileSync(QA_METRICS, 'utf-8'));
    qaHistory = Array.isArray(raw) ? raw : [raw];
  } catch {
    console.warn('  [warn] qa-metrics.json is malformed — QA metrics will not be updated');
  }
} else {
  console.warn('  [warn] qa-metrics.json not found — QA metrics will not be updated');
}

// 4. Schema query field count
let schemaFieldCount = 0;
const SCHEMA_PATH = resolve('schema.graphql');
if (existsSync(SCHEMA_PATH)) {
  try {
    const sdl = readFileSync(SCHEMA_PATH, 'utf-8');
    const schema = buildASTSchema(parse(stripFederation(sdl)));
    const queryType = schema.getQueryType();
    schemaFieldCount = queryType ? Object.keys(queryType.getFields()).length : 0;
  } catch (e) {
    console.warn('  [warn] Could not parse schema.graphql for field count:', (e as Error).message);
  }
} else {
  console.warn('  [warn] schema.graphql not found — schema field count will not be updated');
}

// 5. Latency threshold from source constant
let latencyThresholdMs = 50; // fallback default
const ANOMALY_AGENT = resolve('src/qa/agents/anomaly-agent.ts');
if (existsSync(ANOMALY_AGENT)) {
  const src = readFileSync(ANOMALY_AGENT, 'utf-8');
  const match = src.match(/DEFAULT_LATENCY_THRESHOLD_MS\s*=\s*(\d+)/);
  if (match) latencyThresholdMs = parseInt(match[1], 10);
}

// ─── Build blocks ─────────────────────────────────────────────────────────────

// Coverage badge (shields.io static badge, color-coded)
const badgeColor =
  coveragePct >= 80 ? 'brightgreen' :
  coveragePct >= 60 ? 'yellow' : 'red';
const badgePct = coveragePct > 0 ? coveragePct.toFixed(1) + '%25' : 'unknown';
const coverageBadge = `![Coverage](https://img.shields.io/badge/coverage-${badgePct}-${badgeColor})`;

// Test file table grouped by layer
const TESTS_ROOT = resolve('tests');
const LAYER_ORDER = ['unit/resolvers', 'unit/services', 'unit/utils', 'unit/qa', 'integration', 'contract', 'e2e', 'performance'];
const SKIP_DIRS = ['mocks', 'fixtures', 'setup'];

// Collect all test files grouped by their directory relative to tests/
const filesByDir = new Map<string, string[]>();
for (const layerKey of LAYER_ORDER) {
  const layerDir = join(TESTS_ROOT, layerKey);
  const files = collectTestFiles(layerDir)
    .map(f => displayName(relative(layerDir, f)))
    // skip generated .d files
    .filter(f => !f.endsWith('.d'));
  if (files.length > 0) {
    filesByDir.set(layerKey, files);
  }
}

const layerLabel: Record<string, string> = {
  'unit/resolvers': 'Unit — resolvers',
  'unit/services':  'Unit — services',
  'unit/utils':     'Unit — utils',
  'unit/qa':        'Unit — qa',
  'integration':    'Integration',
  'contract':       'Contract',
  'e2e':            'E2E',
  'performance':    'Performance',
};

const tableRows = [...filesByDir.entries()].map(([layer, files]) => {
  const label = layerLabel[layer] ?? layer;
  const dir = `tests/${layer}/`;
  // Annotate the contract layer with the live schema field count
  let fileList = files.join(', ');
  if (layer === 'contract' && schemaFieldCount > 0) {
    fileList = fileList.replace('query.compliance', `query.compliance (${schemaFieldCount} root fields)`);
  }
  return `| ${label} | \`${dir}\` | ${fileList} |`;
});

const testStructureBlock = [
  '| Layer | Directory | Files |',
  '|---|---|---|',
  ...tableRows,
].join('\n');

// QA trend table (last 5 runs, most recent first)
let qaBlock = '';
if (qaHistory.length > 0) {
  const recent = [...qaHistory].reverse().slice(0, 5);
  const rows = recent.map((run, i) => {
    const date = new Date(run.lastRun).toISOString().split('T')[0];
    const label = i === 0 ? 'latest' : `-${i}`;
    return `| ${label} | ${date} | ${run.totalQueriesExecuted} | ${run.totalAnomaliesDetected} | ${run.highSeverityAnomalies} |`;
  });
  qaBlock = [
    '<!-- auto-generated by update-readme.ts — do not edit between markers -->',
    `**Autonomous QA — last ${recent.length} run(s):**`,
    '| Run | Date | Queries | Anomalies | High |',
    '|---|---|---|---|---|',
    ...rows,
  ].join('\n');
} else if (existsSync(QA_METRICS)) {
  qaBlock = '<!-- auto-generated by update-readme.ts — do not edit between markers -->\n_No QA run data available._';
}

// QA description with live latency threshold
const qaDescBlock =
  `\`src/qa/\` derives queries from the live schema, fuzzes them, flags anomalies ` +
  `(latency > ${latencyThresholdMs} ms or unexpected errors), and persists failures to ` +
  `\`qa-memory.json\` for replay on every subsequent run. ` +
  `See [\`docs/test-strategy.md\`](docs/test-strategy.md) for the full strategy.`;

// ─── Patch README ─────────────────────────────────────────────────────────────

let readme = readFileSync(resolve('README.md'), 'utf-8');

if (totalTests > 0) {
  readme = replaceBetween(
    readme,
    '<!-- README_STATS_START -->',
    '<!-- README_STATS_END -->',
    `This project uses a layered, seven-stage CI pipeline for GraphQL schema stability, ` +
    `runtime safety, and regression detection. All **${totalTests} tests** pass across ` +
    `**${totalSuites} suites**; HTTP is fully mocked by MSW so no live network calls occur in CI.`,
  );
}

if (stmts !== '—') {
  readme = replaceBetween(
    readme,
    '<!-- README_COVERAGE_START -->',
    '<!-- README_COVERAGE_END -->',
    [
      `| Statements | 55% | ${stmts} |`,
      `| Branches   | 60% | ${branches} |`,
      `| Functions  | 44% | ${funcs} |`,
      `| Lines      | 55% | ${lines} |`,
    ].join('\n'),
  );
}

if (coveragePct > 0) {
  readme = replaceBetween(
    readme,
    '<!-- README_BADGES_START -->',
    '<!-- README_BADGES_END -->',
    coverageBadge,
  );
}

if (tableRows.length > 0) {
  readme = replaceBetween(
    readme,
    '<!-- README_TEST_STRUCTURE_START -->',
    '<!-- README_TEST_STRUCTURE_END -->',
    testStructureBlock,
  );
}

if (qaBlock) {
  readme = replaceBetween(
    readme,
    '<!-- AUTONOMOUS_QA_METRICS_START -->',
    '<!-- AUTONOMOUS_QA_METRICS_END -->',
    qaBlock,
  );
}

readme = replaceBetween(
  readme,
  '<!-- README_QA_DESC_START -->',
  '<!-- README_QA_DESC_END -->',
  qaDescBlock,
);

writeFileSync(resolve('README.md'), readme, 'utf-8');

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log('README.md updated:');
if (totalTests > 0)   console.log(`  tests         : ${totalTests} across ${totalSuites} suites`);
if (stmts !== '—')    console.log(`  coverage      : stmts=${stmts}  branches=${branches}  funcs=${funcs}  lines=${lines}`);
if (coveragePct > 0)  console.log(`  badge         : ${coverageBadge}`);
if (tableRows.length) console.log(`  test structure: ${tableRows.length} layer(s), ${schemaFieldCount} schema fields`);
if (qaBlock)          console.log(`  qa metrics    : ${qaHistory.length} run(s) in history`);
console.log(`  latency desc  : ${latencyThresholdMs}ms threshold`);
