#!/usr/bin/env node
/**
 * Route coverage verifier for the third-party integration guide.
 *
 * Collects every developer-facing route exposed by the API gateway (forwarded
 * routes from forward-routes.ts plus locally-implemented OAuth/callback
 * routes) and checks that each one appears in the given documentation files.
 *
 * Usage:
 *   node docs/scripts/verify-integration-guide.mjs [file ...]
 *
 * With no arguments it checks docs/thirdparty-integration-guide.md and
 * docs/thirdparty-integration-guide.html. Exits 0 only when every route is
 * documented in every file.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const forwardRoutesFile = path.join(repoRoot, 'openplatform-api-service/src/config/forward-routes.ts');

const LOCAL_ROUTES = [
  '/api/thirdparty/oauth/authorizeUrl',
  '/api/thirdparty/oauth/verify',
  '/api/thirdparty/oauth/token',
  '/api/thirdparty/custody/callback',
  '/api/oauth/appToken/refresh',
  '/api/oauth/revoke',
  '/api/oauth/appToken/validate',
];

const DEFAULT_DOCS = [
  'docs/thirdparty-integration-guide.md',
  'docs/thirdparty-integration-guide.html',
];

const forwardedRoutes = [
  ...readFileSync(forwardRoutesFile, 'utf8').matchAll(/inboundPath:\s*'([^']+)'/g),
].map((match) => match[1]);

// Deduplicate while preserving order, then keep the original path for reporting.
const expectedRoutes = [...new Set([...forwardedRoutes, ...LOCAL_ROUTES])];

// Placeholders are compared in canonical form: '{anything}' becomes '{'.
const normalizePlaceholders = (text) => text.replace(/\{[^}]*\}/g, '{');
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Accept both the absolute path and the relative path with the
// '/api/thirdparty/' prefix omitted.
const pathCandidates = (route) => {
  const normalized = normalizePlaceholders(route);
  const prefix = '/api/thirdparty/';
  const candidates = [normalized];
  if (normalized.startsWith(prefix)) {
    candidates.push(`/${normalized.slice(prefix.length)}`);
  }
  return [...new Set(candidates)];
};

// A match must end at a path-segment boundary so '/treasury/create' does not
// count as documented just because '/treasury/create-custom' appears.
const isDocumented = (docText, route) =>
  pathCandidates(route).some((candidate) =>
    new RegExp(`${escapeRegExp(candidate)}(?![A-Za-z0-9_-])`).test(docText)
  );

const args = process.argv.slice(2);
const docs = args.length > 0
  ? args.map((arg) => ({ display: arg, file: path.resolve(process.cwd(), arg) }))
  : DEFAULT_DOCS.map((doc) => ({ display: doc, file: path.join(repoRoot, doc) }));

let allDocumented = true;

for (const { display, file } of docs) {
  if (!existsSync(file)) {
    console.log(`${display}: file not found`);
    allDocumented = false;
    continue;
  }

  const docText = normalizePlaceholders(readFileSync(file, 'utf8'));
  const missing = expectedRoutes.filter((route) => !isDocumented(docText, route));

  if (missing.length === 0) {
    console.log(`${display}: all ${expectedRoutes.length} routes documented`);
  } else {
    console.log(`${display}: missing ${missing.length} route(s)`);
    for (const route of missing) {
      console.log(`  - ${route}`);
    }
    allDocumented = false;
  }
}

process.exit(allDocumented ? 0 : 1);
