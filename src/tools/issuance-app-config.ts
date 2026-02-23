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

const KEY_GEN_INSTRUCTIONS = `Partner ID and credentials config are filled. You must generate PARTNER_PRIVATE_KEY and NEXT_PUBLIC_PARTNER_PUBLIC_KEY and add them to .env.local.

To populate .env.local with no manual steps (secure: keys never in clipboard), run from the issuance template repo root:
  pnpm run generate-keys
This appends PARTNER_PRIVATE_KEY, NEXT_PUBLIC_PARTNER_PUBLIC_KEY, and SIGNING_ALGORITHM=ES256 to .env.local (no openssl required).

Alternatively, generate manually:
1. Generate private key (P-256, PEM body only, single line):
   openssl ecparam -name prime256v1 -genkey -noout | openssl pkcs8 -topk8 -nocrypt | tail -n +2 | head -n -1 | tr -d '\\n'
2. Set PARTNER_PRIVATE_KEY to the output (no BEGIN/END lines).
3. Derive public key from private key (paste private key between BEGIN/END for the -in value):
   openssl ec -in <(echo "-----BEGIN PRIVATE KEY-----"; echo "<PASTE_KEY_BODY>"; echo "-----END PRIVATE KEY-----") -pubout 2>/dev/null | grep -v "BEGIN\\|END" | tr -d '\\n'
4. Set NEXT_PUBLIC_PARTNER_PUBLIC_KEY to that output. Set SIGNING_ALGORITHM=ES256.
5. NEXT_PUBLIC_JWKS_KID can be omitted (defaults to NEXT_PUBLIC_PARTNER_ID). JWKS URL after deploy: https://<your-deployed-origin>/jwks.json — set this in the credential Partner Dashboard. After deploy, set JWKS URL in the credential Partner Dashboard to https://<your-origin>/jwks.json.`;

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

export async function getIssuanceAppConfig(args: IssuanceAppConfigArgs) {
  session.requireAuth();

  const partnerId = session.get('partnerId');
  const issuerDid = session.get('issuerDid');
  if (!partnerId || !issuerDid) {
    throw new Error('Session missing partnerId or issuerDid. Re-authenticate with credential_authenticate.');
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
    `# Issuance app env — paste into .env.local`,
    `NEXT_PUBLIC_PARTNER_ID=${partnerId}`,
    `NEXT_PUBLIC_CREDENTIALS_CONFIG=${JSON.stringify(credentialsConfig)}`,
    `NEXT_PUBLIC_APP_NAME=${JSON.stringify(appName)}`,
    `NEXT_PUBLIC_HEADLINE=${JSON.stringify(headline)}`,
    `NEXT_PUBLIC_BUILD_ENV=staging`,
    `NEXT_PUBLIC_MOCA_CHAIN=devnet`,
    `NEXT_PUBLIC_AUTH_METHOD=wallet`,
    `NEXT_PUBLIC_THEME=system`,
    `SIGNING_ALGORITHM=ES256`,
    `# NEXT_PUBLIC_JWKS_KID=${partnerId}`,
    `# PARTNER_PRIVATE_KEY= — generate and paste (see notes)`,
    `# NEXT_PUBLIC_PARTNER_PUBLIC_KEY= — derive from private key (see notes)`,
    ``,
    `# Optional for wallet auth:`,
    `# NEXT_PUBLIC_REOWN_PROJECT_ID=`,
  ];

  const envSnippet = envLines.join('\n');

  return {
    envSnippet,
    notes: KEY_GEN_INSTRUCTIONS,
    partnerId,
    issuerDid,
    credentialId,
    credentialName,
    appName,
    headline,
    dataPoints,
  };
}
