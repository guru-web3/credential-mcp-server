#!/usr/bin/env node

/**
 * Scenario test runner for credential MCP (Zephyr-first).
 * 1. Loads docs/zephyr-scenarios.json (from Zephyr xlsx via extract-zephyr-scenarios.js).
 * 2. Runs unit tests grouped by Zephyr folder (Wallet Login → Issuer Schema → Issuer Program → Verifier Program → General/List/Pricing → Docs).
 * 3. If PRIVATE_KEY or E2E_PRIVATE_KEY is set, runs a minimal E2E: authenticate + list schemas.
 *
 * Usage:
 *   node scripts/run-scenario-tests.js
 *   PRIVATE_KEY=0x... node scripts/run-scenario-tests.js   # include E2E
 */

import { readFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const scenariosPath = join(rootDir, 'docs', 'zephyr-scenarios.json');

/** Zephyr folder (path suffix) → test files for that flow */
const FOLDER_TO_TESTS = {
  'Wallet Login': [
    'tests/auth-validation.test.js',
    'tests/login-message.test.js',
  ],
  'Issuer Schema': [
    'tests/create-schema-validation.test.js',
    'tests/verify-schema-published-validation.test.js',
  ],
  'Issuer Program': [
    'tests/create-credential-template-validation.test.js',
  ],
  'Verifier Program': [
    'tests/create-programs-validation.test.js',
  ],
  'General': [
    'tests/setup-pricing-validation.test.js',
    'tests/list-schemas-validation.test.js',
    'tests/list-templates-validation.test.js',
    'tests/list-programs-validation.test.js',
  ],
  'Docs': [
    'tests/credential-docs-validation.test.js',
    'tests/template-info-validation.test.js',
  ],
};

/** Order of folder groups for running (matches Zephyr / plan). */
const FOLDER_ORDER = [
  'Wallet Login',
  'Issuer Schema',
  'Issuer Program',
  'Verifier Program',
  'General',
  'Docs',
];

function run(command, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const c = spawn(command, args, { stdio: 'inherit', cwd: rootDir, ...opts });
    c.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))));
    c.on('error', reject);
  });
}

function loadZephyrScenarios() {
  if (!existsSync(scenariosPath)) {
    return null;
  }
  const raw = readFileSync(scenariosPath, 'utf8');
  return JSON.parse(raw);
}

/** Normalize folder path to key (e.g. "/Credential Dashboard/Wallet Login" → "Wallet Login"). */
function folderKey(folderPath) {
  if (!folderPath || typeof folderPath !== 'string') return null;
  const parts = folderPath.split('/').filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 1] : parts[0] || null;
}

/** Get unique folders present in scenarios and return ordered list of (folderLabel, testFiles). */
function getOrderedTestGroups(zephyr) {
  const seen = new Set();
  const groups = [];
  for (const label of FOLDER_ORDER) {
    const files = FOLDER_TO_TESTS[label];
    if (files && files.length && !seen.has(label)) {
      seen.add(label);
      groups.push({ label, files });
    }
  }
  return groups;
}

async function runUnitTestsByFolder() {
  const zephyr = loadZephyrScenarios();
  const groups = getOrderedTestGroups(zephyr);

  if (zephyr) {
    console.log(`Zephyr scenarios: ${zephyr.scenarioCount} (source: ${zephyr.source || 'zephyr-scenarios.json'})\n`);
  }

  for (const { label, files } of groups) {
    console.log(`\n--- ${label} ---\n`);
    await run('node', ['--test', ...files]);
  }
}

async function runE2E() {
  const privateKey = process.env.PRIVATE_KEY || process.env.E2E_PRIVATE_KEY;
  if (!privateKey) return;

  console.log('\n--- E2E: authenticate + list schemas (staging) ---\n');
  const { authenticate } = await import('../dist/tools/authenticate.js');
  const { listSchemas } = await import('../dist/tools/list-schemas.js');

  const auth = await authenticate({ privateKey, environment: 'staging' });
  if (!auth.success || !auth.partnerId) {
    throw new Error('E2E auth failed: ' + JSON.stringify(auth));
  }
  console.log('Authenticated partnerId:', auth.partnerId);

  const list = await listSchemas({});
  console.log('List schemas: total=', list.total ?? list.records?.length ?? 0, 'records');
}

async function main() {
  console.log('Credential MCP scenario test runner (Zephyr-first)\n');
  await runUnitTestsByFolder();
  await runE2E();
  console.log('\nAll scenario checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
