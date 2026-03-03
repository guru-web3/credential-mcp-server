#!/usr/bin/env node
/**
 * Sync .env from credential-dashboard env file.
 * Copies API URL, MOCA RPC, chain ID, and contract addresses from dashboard VITE_APP_* vars
 * into this repo's .env. Does not overwrite existing CREDENTIAL_API_SIGNATURE_KEY or
 * CREDENTIAL_MCP_PRIVATE_KEY (you must set those yourself).
 *
 * Usage:
 *   node scripts/sync-env-from-dashboard.js [path-to-dashboard-env]
 *   DASHBOARD_ENV_PATH=../credential-dashboard/.env.staging node scripts/sync-env-from-dashboard.js
 *
 * Example paths:
 *   ../credential-dashboard/.env.staging
 *   ../credential-dashboard/.env.development
 *   ../credential-dashboard/.env.sandbox-testnet
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_DASHBOARD_PATHS = [
  path.join(__dirname, '../.env.dashboard.staging'),
  path.join(__dirname, '../../credential-dashboard/.env.staging'),
  path.join(__dirname, '../../credential-dashboard/.env.development'),
];

// Dashboard VITE_APP_* -> MCP env var name
const DASHBOARD_TO_MCP = {
  VITE_APP_HOST_URL: 'CREDENTIAL_API_URL',
  VITE_APP_MOCA_RPC_URL: 'MOCA_RPC_URL',
  VITE_APP_MOCA_CHAIN_ID: 'MOCA_CHAIN_ID',
  VITE_APP_MOCA_PAYMENTS_CONTRACT: 'MOCA_PAYMENTS_CONTRACT',
  VITE_APP_ISSUER_STAKING_CONTROLLER_ADDRESS: 'MOCA_ISSUER_STAKING_CONTROLLER_ADDRESS',
  VITE_APP_MOCA_CHAIN_API: 'MOCA_CHAIN_API_URL',
};

// Infer CREDENTIAL_MCP_ENVIRONMENT from API URL
function inferEnvironment(apiUrl) {
  if (!apiUrl) return 'staging';
  const u = apiUrl.toLowerCase();
  if (u.includes('devnet') || u.includes('sandbox.air3')) return 'sandbox';
  if (u.includes('staging.air3')) return 'staging';
  if (u.includes('air3.com') && !u.includes('staging') && !u.includes('sandbox')) return 'production';
  return 'staging';
}

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const out = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function loadExistingEnv(envPath) {
  if (!fs.existsSync(envPath)) return {};
  return parseEnvFile(envPath);
}

function main() {
  const dashboardPath =
    process.argv[2] ||
    process.env.DASHBOARD_ENV_PATH ||
    DEFAULT_DASHBOARD_PATHS.find((p) => fs.existsSync(p));

  if (!dashboardPath || !fs.existsSync(dashboardPath)) {
    console.error('Usage: node scripts/sync-env-from-dashboard.js <path-to-dashboard-env>');
    console.error('Example: node scripts/sync-env-from-dashboard.js ../credential-dashboard/.env.staging');
    console.error('Or set DASHBOARD_ENV_PATH to the path of a credential-dashboard .env file.');
    process.exit(1);
  }

  const dashboardEnv = parseEnvFile(dashboardPath);
  const mcpEnvPath = path.join(__dirname, '..', '.env');
  const existing = loadExistingEnv(mcpEnvPath);

  const lines = [
    '# Auto-generated/merged from credential-dashboard. Edit as needed. Do not commit.',
    '# Source: ' + path.resolve(dashboardPath),
    '',
  ];

  // 1) CREDENTIAL_MCP_ENVIRONMENT (infer from dashboard API URL)
  const apiUrl = dashboardEnv.VITE_APP_HOST_URL || existing.CREDENTIAL_API_URL;
  const envName = existing.CREDENTIAL_MCP_ENVIRONMENT || inferEnvironment(apiUrl);
  lines.push('CREDENTIAL_MCP_ENVIRONMENT=' + envName);
  lines.push('');

  // 2) Mapped from dashboard (only if we got a value; don't overwrite existing with empty)
  for (const [dashKey, mcpKey] of Object.entries(DASHBOARD_TO_MCP)) {
    const value = dashboardEnv[dashKey] ?? existing[mcpKey];
    if (value) lines.push(mcpKey + '=' + value);
  }
  lines.push('');

  // 3) Required: CREDENTIAL_API_SIGNATURE_KEY (preserve existing or leave placeholder)
  if (existing.CREDENTIAL_API_SIGNATURE_KEY) {
    lines.push('CREDENTIAL_API_SIGNATURE_KEY=' + existing.CREDENTIAL_API_SIGNATURE_KEY);
  } else {
    lines.push('# Required: get from Credential Dashboard (API / Developer settings)');
    lines.push('CREDENTIAL_API_SIGNATURE_KEY=');
  }
  lines.push('');

  // 4) Optional secrets (preserve existing, do not emit if empty)
  const optionalSecretKeys = [
    'CREDENTIAL_MCP_DEBUG',
    'CREDENTIAL_MCP_PRIVATE_KEY',
    'CREDENTIAL_MCP_SEED_PHRASE',
    'CREDENTIAL_MCP_ACCOUNT_INDEX',
    'MCP_HTTP_PORT',
    'MCP_OAUTH_BASE_URL',
    'MCP_OAUTH_JWT_SECRET',
    'MCP_OAUTH_REDIRECT_URIS',
    'CREDENTIAL_SIGNER_URL',
    'CREDENTIAL_DASHBOARD_URL',
  ];
  for (const key of optionalSecretKeys) {
    if (existing[key] !== undefined && existing[key] !== '') {
      lines.push(key + '=' + existing[key]);
    }
  }

  const out = lines.join('\n').trimEnd() + '\n';
  fs.writeFileSync(mcpEnvPath, out, 'utf8');
  console.log('Wrote ' + mcpEnvPath + ' (from ' + path.basename(dashboardPath) + ')');
  if (!existing.CREDENTIAL_API_SIGNATURE_KEY) {
    console.log('Set CREDENTIAL_API_SIGNATURE_KEY in .env (from Credential Dashboard API / Developer settings).');
  }
}

main();
