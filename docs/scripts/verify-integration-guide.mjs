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
 * documented in every file. HTML comment regions are ignored; comment-like
 * text inside Markdown code fences is not, and a route merely mentioned in
 * prose still counts as documented.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const forwardRoutesFile = path.join(repoRoot, 'openplatform-api-service/src/config/forward-routes.ts');
const EXPECTED_FORWARDED_ROUTES = 23;

const LOCAL_ROUTES = [
  '/api/thirdparty/oauth/authorizeUrl',
  '/api/thirdparty/oauth/verify',
  '/api/thirdparty/custody/callback',
  '/api/oauth/appToken/refresh',
  '/api/oauth/revoke',
  '/api/oauth/appToken/validate',
];

const DEFAULT_DOCS = [
  'docs/thirdparty-integration-guide.md',
  'docs/thirdparty-integration-guide.html',
];

const fail = (message) => {
  console.log(message);
  process.exit(1);
};

let forwardRoutesSource;
try {
  forwardRoutesSource = readFileSync(forwardRoutesFile, 'utf8');
} catch (err) {
  fail(`cannot read openplatform-api-service/src/config/forward-routes.ts (${err.code})`);
}

const forwardedRoutes = [
  ...forwardRoutesSource.matchAll(/inboundPath:\s*['"]([^'"]+)['"]/g),
].map((match) => match[1]);

if (forwardedRoutes.length !== EXPECTED_FORWARDED_ROUTES) {
  fail(
    `could not parse routes from openplatform-api-service/src/config/forward-routes.ts ` +
    `(found ${forwardedRoutes.length}, expected ${EXPECTED_FORWARDED_ROUTES})`
  );
}

// Deduplicate while preserving order, then keep the original path for reporting.
const expectedRoutes = [...new Set([...forwardedRoutes, ...LOCAL_ROUTES])];

// Placeholders are compared in canonical form: '{anything}' becomes '{'.
// Nested braces are intentionally not treated as one placeholder.
const normalizePlaceholders = (text) => text.replace(/\{[^{}]*\}/g, '{');
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

// A candidate must stand alone (left boundary) and end at a path-segment
// boundary, so '/treasury/create' does not match '/api/v1/treasury/create' or
// '/treasury/create-custom'.
const isDocumented = (docText, route) =>
  pathCandidates(route).some((candidate) =>
    new RegExp(`(?<![A-Za-z0-9_-])${escapeRegExp(candidate)}(?![A-Za-z0-9_-])`).test(docText)
  );

const stripHtmlComments = (text) => text.replace(/<!--[\s\S]*?-->/g, '');

const args = process.argv.slice(2);
const docs = args.length > 0
  ? args.map((arg) => ({ display: arg, file: path.resolve(process.cwd(), arg) }))
  : DEFAULT_DOCS.map((doc) => ({ display: doc, file: path.join(repoRoot, doc) }));

console.log(
  `forwarded=${forwardedRoutes.length} local=${LOCAL_ROUTES.length} total=${expectedRoutes.length}`
);

let allDocumented = true;

for (const { display, file } of docs) {
  let source;
  try {
    source = readFileSync(file, 'utf8');
  } catch (err) {
    console.log(`${display}: cannot read (${err.code})`);
    allDocumented = false;
    continue;
  }

  const docText = path.extname(file).toLowerCase() === '.html'
    ? stripHtmlComments(source)
    : source;
  const normalizedText = normalizePlaceholders(docText);
  const missing = expectedRoutes.filter((route) => !isDocumented(normalizedText, route));

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
