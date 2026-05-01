#!/usr/bin/env node
// Strips Apollo Federation v2 preamble from a schema file so that
// graphql-inspector (which uses plain buildASTSchema) can parse it.
// Usage: node scripts/strip-federation.js <input.graphql> <output.graphql>

const fs = require('fs');
const [,, src, dst] = process.argv;
if (!src || !dst) {
  console.error('Usage: strip-federation.js <input> <output>');
  process.exit(1);
}

let sdl = fs.readFileSync(src, 'utf-8');

// Remove multiline directive definitions for federation-only directives
sdl = sdl.replace(/directive\s+@(?:contact|link)\b[\s\S]*?\bon\s+\w+(?:\s*\|\s*\w+)*\s*\n/g, '');

// Remove the entire "extend schema { ... }" block (may span multiple lines)
sdl = sdl.replace(/extend\s+schema[\s\S]*?(?=\n(?:type|interface|union|enum|scalar|input|directive)\s)/g, '');

// Remove inline @key and @contact usages on type definitions
sdl = sdl.replace(/@key\s*\([^)]*\)/g, '');
sdl = sdl.replace(/@contact\s*\([^)]*\)/g, '');

// Collapse excess blank lines
sdl = sdl.replace(/\n{3,}/g, '\n\n').trim() + '\n';

fs.writeFileSync(dst, sdl);
