/**
 * Generate .env snippet for the issuance template from session + optional template ID.
 * Requires auth. Fetches template and schema to fill credential name, app name, headline, and dataPoints.
 * Instructs agent to auto-generate keys and populate .env (no manual steps).
 */

import { z } from 'zod';
import { session } from '../session.js';
import { listCredentialTemplates, type CredentialTemplateRecord } from './list-credential-templates.js';
import { apiRequest } from '../utils/api.js';

export const IssuanceAppConfigArgsSchema = z.object({
  credentialTemplateId: z.string().optional().describe('Issuance program ID (credentialId). If omitted, uses first template from list or session.'),
});

export type IssuanceAppConfigArgs = z.infer<typeof IssuanceAppConfigArgsSchema>;

const DEFAULT_REOWN_PROJECT_ID = '9bf1bbff192817bf581a16241732bfb4';

const STRICT_REPLACE_INSTRUCTIONS = `When writing or updating .env.local, strictly replace (overwrite) these three variables every time: NEXT_PUBLIC_REOWN_PROJECT_ID, NEXT_PUBLIC_PARTNER_PUBLIC_KEY, PARTNER_PRIVATE_KEY.`;

const KEY_GEN_INSTRUCTIONS = `Partner ID, JWKS kid, credentials config, and default Reown project ID are filled. Default: if NEXT_PUBLIC_PARTNER_PUBLIC_KEY or PARTNER_PRIVATE_KEY is not given, run pnpm run generate-keys and populate .env.local.

Strict replace: When writing/updating .env.local, strictly replace (overwrite) these three every time: NEXT_PUBLIC_REOWN_PROJECT_ID, NEXT_PUBLIC_PARTNER_PUBLIC_KEY, PARTNER_PRIVATE_KEY.

Option A — Auto (recommended, default when keys not given): Run from the issuance template repo root:
  pnpm run generate-keys
This appends PARTNER_PRIVATE_KEY, NEXT_PUBLIC_PARTNER_PUBLIC_KEY, and SIGNING_ALGORITHM=ES256 to .env.local. Use the default NEXT_PUBLIC_REOWN_PROJECT_ID (already in the snippet below).

Option B — Generate and provide: Generate PARTNER_PRIVATE_KEY and NEXT_PUBLIC_PARTNER_PUBLIC_KEY manually (P-256, PEM body only), then set all three in .env.local:
1. openssl ecparam -name prime256v1 -genkey -noout | openssl pkcs8 -topk8 -nocrypt | tail -n +2 | head -n -1 | tr -d '\\n' → PARTNER_PRIVATE_KEY
2. Derive public key from private key → NEXT_PUBLIC_PARTNER_PUBLIC_KEY. Set SIGNING_ALGORITHM=ES256.
3. Optionally set NEXT_PUBLIC_REOWN_PROJECT_ID (default is already in the snippet).

JWKS URL after deploy: https://<your-deployed-origin>/jwks.json — set in credential Partner Dashboard.`;

interface SchemeRecord {
  attributeObj?: { data?: Array<{ name?: string }> };
  attribute?: { data?: Array<{ name?: string }> };
  schemeId?: string;
  id?: string;
  [key: string]: unknown;
}

interface SchemeQueryPage {
  records?: SchemeRecord[];
  total?: number;
}

/** Extract dataPoint names from scheme record (attributeObj.data or attribute.data). */
function getDataPointsFromSchemeRecord(record: SchemeRecord): string[] {
  const attr = record?.attributeObj ?? record?.attribute;
  if (!attr || typeof attr !== 'object') return [];
  const data = (attr as { data?: Array<{ name?: string }> }).data;
  if (!Array.isArray(data)) return [];
  return data.map((a) => a.name).filter((n): n is string => typeof n === 'string');
}

async function fetchSchemaDataPoints(schemeId: string): Promise<string[]> {
  const issuerId = session.get('issuerId');
  if (!issuerId) return [];
  try {
    const res = await apiRequest<{ page?: SchemeQueryPage }>(
      'POST',
      '/management/scheme/query',
      {
        size: 10,
        page: 1,
        searchStr: schemeId,
        filterType: 'own_schemas',
        issuer_id: issuerId,
        sorts: [{ field: 'createAt', sort: -1 }],
      },
      { 'x-issuer-id': issuerId }
    );
    const records = res.data?.page?.records ?? [];
    const match = records.find(
      (r) => toLowerSafe(r.schemeId) === toLowerSafe(schemeId) || toLowerSafe(r.id) === toLowerSafe(schemeId)
    );
    const record = match ?? records[0];
    if (record) return getDataPointsFromSchemeRecord(record);
  } catch {
    // ignore
  }
  return [];
}

function toLowerSafe(value: unknown): string {
  if (value == null) return '';
  return String(value).toLowerCase();
}

function findTemplateById(
  templates: CredentialTemplateRecord[],
  credentialTemplateId: string | number | undefined
): CredentialTemplateRecord | undefined {
  const id = toLowerSafe(credentialTemplateId);
  if (!id) return undefined;
  return templates.find((t) => {
    const tId = toLowerSafe(t.id);
    const tCredId = toLowerSafe(t.credentialId);
    return (tId && tId === id) || (tCredId && tCredId === id);
  });
}

async function fetchIssuerDid(issuerId: string): Promise<string | undefined> {
  try {
    const res = await apiRequest<{ partnerId?: string; did?: string; issuerDid?: string }>(
      'GET',
      '/management/issuer/queryById',
      { issuerId },
      { 'x-issuer-id': issuerId }
    );
    const data = res.data;
    return data?.did || data?.issuerDid || undefined;
  } catch {
    // If fetching issuer info fails, return undefined and let caller handle
    return undefined;
  }
}

export async function getIssuanceAppConfig(args: IssuanceAppConfigArgs) {
  session.requireAuth();

  const partnerId = session.get('partnerId');
  let issuerDid = session.get('issuerDid');
  const issuerId = session.get('issuerId');
  
  if (!partnerId) {
    throw new Error('Session missing partnerId. Re-connect to the MCP server to authenticate.');
  }

  // If issuerDid is missing from session, try to fetch it from the API
  if (!issuerDid && issuerId) {
    console.log('[DEBUG] issuerDid missing from session, attempting to fetch from API...');
    issuerDid = await fetchIssuerDid(issuerId);
    if (issuerDid) {
      session.set('issuerDid', issuerDid);
      console.log('[DEBUG] Successfully fetched issuerDid from API');
    }
  }

  if (!issuerDid) {
    throw new Error('Session missing issuerDid. Re-connect to the MCP server to authenticate, or check that the API returns issuerDid.');
  }

  const requestedId = args?.credentialTemplateId ?? session.get('credentialTemplateId');
  let credentialId: string;
  let credentialName: string;
  let dataPoints: string[];
  let appName: string;
  let headline: string;

  if (requestedId) {
    const { templates } = await listCredentialTemplates({
      page: 1,
      size: 100,
      searchStr: String(requestedId),
      sortField: 'create_at',
      order: 'desc',
    });
    const template = findTemplateById(templates, requestedId);
    if (!template) {
      throw new Error(`Credential template not found: ${String(requestedId)}. Check the ID or list templates with credential_list_templates.`);
    }
    credentialId = template.credentialId != null ? String(template.credentialId) : template.id != null ? String(template.id) : String(requestedId);
    credentialName = template.credentialName ?? template.schemeTitle ?? 'Issuance credential';
    const schemeId = template.schemeId;
    dataPoints = schemeId ? await fetchSchemaDataPoints(schemeId) : [];
    if (dataPoints.length === 0) dataPoints = ['dataPoint1'];
    appName = credentialName;
    headline = `Store your ${credentialName} securely on Moca Network`;
  } else {
    const { templates } = await listCredentialTemplates({
      page: 1,
      size: 1,
      sortField: 'create_at',
      order: 'desc',
    });
    const first = templates?.[0];
    if (!first) {
      throw new Error('No credential template ID. Create a program with credential_create_program or pass credentialTemplateId.');
    }
    credentialId = first.credentialId != null ? String(first.credentialId) : first.id != null ? String(first.id) : '';
    credentialName = first.credentialName ?? first.schemeTitle ?? 'Issuance credential';
    const schemeId = first.schemeId;
    dataPoints = schemeId ? await fetchSchemaDataPoints(schemeId) : [];
    if (dataPoints.length === 0) dataPoints = ['dataPoint1'];
    appName = credentialName;
    headline = `Store your ${credentialName} securely on Moca Network`;
  }

  const credentialsConfig = [
    { did: issuerDid, programId: credentialId, name: credentialName, dataPoints },
  ];
  const envLines = [
    `# Issuance app env — paste into .env.local. JWKS_KID and REOWN_PROJECT_ID are pre-filled below; do not leave them empty.`,
    `# Strictly replace only: PARTNER_PRIVATE_KEY, NEXT_PUBLIC_PARTNER_PUBLIC_KEY, NEXT_PUBLIC_REOWN_PROJECT_ID (if overriding).`,
    `NEXT_PUBLIC_PARTNER_ID=${partnerId}`,
    `NEXT_PUBLIC_JWKS_KID=${partnerId}`,
    `NEXT_PUBLIC_REOWN_PROJECT_ID=${DEFAULT_REOWN_PROJECT_ID}`,
    `NEXT_PUBLIC_CREDENTIALS_CONFIG=${JSON.stringify(credentialsConfig)}`,
    `NEXT_PUBLIC_APP_NAME=${JSON.stringify(appName)}`,
    `NEXT_PUBLIC_HEADLINE=${JSON.stringify(headline)}`,
    `NEXT_PUBLIC_BUILD_ENV=staging`,
    `NEXT_PUBLIC_MOCA_CHAIN=devnet`,
    `NEXT_PUBLIC_AUTH_METHOD=wallet`,
    `NEXT_PUBLIC_THEME=system`,
    `SIGNING_ALGORITHM=ES256`,
    `# PARTNER_PRIVATE_KEY= — run pnpm run generate-keys or paste (see notes)`,
    `# NEXT_PUBLIC_PARTNER_PUBLIC_KEY= — from generate-keys or derive from private key (see notes)`,
  ];

  const envSnippet = envLines.join('\n');

  const localTesting = {
    localHttps:
      'Run `pnpm dev` and open http://localhost:3000 in the browser. For JWKS, always use the tunnel URL from the console (never localhost).',
    tunnel:
      'For e2e local testing: run `pnpm dev`, then in another terminal run `npx instatunnel 3000`. Copy the HTTPS URL from the console and use it as origin for credential_configure_issuer_jwks. Never use localhost for JWKS. The MCP probe sends bypass-tunnel-reminder when needed.',
    configureTool:
      'Call credential_configure_issuer_jwks with origin set to the tunnel URL you copied from the console (from npx instatunnel 3000). Do not use localhost for JWKS. Use probeBeforeUpdate: true so the tool checks the endpoint after the server is up.',
    noApiMock:
      'Default when no API given: do not edit app/(home)/api/user/user-data/route.ts. Rely on the built-in mock (NEXT_PUBLIC_CREDENTIALS_CONFIG + dataPoints). Mock by type: string → "test", integer/number → 0, boolean → false. Add a TODO in app/(home)/api/user/user-data/route.ts for plugging in a real API later. See mcp-issuance.md and TOOLS.md "User data and mocking".',
    dashboardSteps:
      'Alternatively, in the credential Partner Dashboard: Settings → General, set JWKS URL to https://<origin>/jwks.json; Settings → Domains, add the hostname.',
    afterDeploy:
      'When ready for production: deploy the app, then call credential_configure_issuer_jwks with the deployed origin, or in the dashboard set JWKS URL to https://<your-deployed-origin>/jwks.json and update the whitelist.',
  };

  return {
    envSnippet,
    notes: KEY_GEN_INSTRUCTIONS,
    strictReplaceInstructions: STRICT_REPLACE_INSTRUCTIONS,
    prefilledInSnippet:
      'The envSnippet already includes NEXT_PUBLIC_JWKS_KID, NEXT_PUBLIC_REOWN_PROJECT_ID, and NEXT_PUBLIC_CREDENTIALS_CONFIG with dataPoints from the schema. Paste the entire snippet into .env.local—do not remove or simplify NEXT_PUBLIC_CREDENTIALS_CONFIG or dataPoints (the template uses them for built-in user-data mocking). Do not leave required fields empty or overwrite with placeholders. Do not echo or repeat any partner ID from this response.',
    issuerDid,
    credentialId,
    credentialName,
    appName,
    headline,
    dataPoints,
    localTesting,
  };
}
