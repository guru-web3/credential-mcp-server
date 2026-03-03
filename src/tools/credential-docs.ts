/**
 * Return structured docs and steps for issuance and/or verification.
 * Aligned with AIR Kit Quickstart 2 (Issue Credentials) and Quickstart 3 (Verify Credentials).
 * Production standards: JWT on backend, env for secrets, schema/program setup via MCP or Dashboard.
 */

import { z } from 'zod';
import { getCredentialDashboardUrl } from '../config.js';

export const CredentialDocsArgsSchema = z.object({
  flow: z
    .union([
      z.enum(['issuance', 'verification', 'both']),
      z.string().transform((s) => {
        const v = String(s).toLowerCase();
        if (v.includes('verif')) return 'verification';
        if (v.includes('issu')) return 'issuance';
        return 'both';
      }),
    ])
    .default('both')
    .describe('Which flow to document: issuance, verification, or both'),
});

export type CredentialDocsArgs = z.infer<typeof CredentialDocsArgsSchema>;

function buildIssuanceSteps(): string {
  const dashboardUrl = getCredentialDashboardUrl();
  return `## Quickstart 2: Issue Credentials (MCP + app)

This flow is aligned with [AIR Kit Quickstart: Credential Issuance](https://docs.moca.network/airkit/quickstart/issue-credentials).

### Before starting
- Node.js v16+
- (Recommended) [Login & Sessions Quickstart](https://docs.moca.network/airkit/quickstart/) completed or understood

### MCP setup (schema + program + pricing)

1. **Connect (auth)** – In Cursor, connect to the MCP server (Connect/Start or HTTP OAuth). Session is set automatically; no separate auth tool.

2. **Create schema** – \`credential_create_schema\`:
   - \`schemaName\`, \`schemaType\` (alphanumeric, unique), \`dataPoints\` (name, type: string|integer|number|boolean, optional description)
   - Optional: \`description\`, \`version\` (default "1.0")
   - [Schema Creation Guide](https://docs.moca.network/airkit/usage/credential/schema-creation)

3. **Create issuance program** – \`credential_create_program\`:
   - \`schemaId\` (or use last created). Use returned \`programId\` as \`credentialId\` in the SDK.
   - Optional: \`expirationDuration\`, \`issueMax\`, \`accessibleStartAt\`/\`accessibleEndAt\`, \`complianceAccessKeyEnabled\`

4. **Set pricing** – \`credential_setup_pricing\`:
   - \`pricingModel\`: "each_attempt" or "pay_on_success"
   - Optional: \`priceUsd\` (if > 0, use \`setPriceUrl\` for on-chain step), \`complianceAccessKeyEnabled\`

### In your app (production standards)

- **Install:** \`npm install @mocanetwork/airkit\`
- **Config:** Partner ID and Issuer DID from [Developer Dashboard → Account → General](${dashboardUrl}/dashboard/general).
- **JWT:** For production, **generate JWTs on the backend** to keep private keys secure. [Partner Authentication](https://docs.moca.network/airkit/usage/partner-authentication). Configure JWKS URL in Dashboard.
- **Issue:** \`airService.issueCredential({ authToken: jwt, credentialId, credentialSubject, issuerDid, curve?: "secp256r1" | "secp256k1" })\`. \`credentialSubject\` keys must match schema attributes (string, number, boolean, date).
- **CAK:** If compliance encryption is enabled, handle \`result.cakPublicKey\` for encrypting compliance data.
- **Server-side:** For issuance without user interaction, use [Issue on Behalf](https://docs.moca.network/airkit/usage/credential/issue-on-behalf).

**Docs:** [Quickstart: Issue Credentials](https://docs.moca.network/airkit/quickstart/issue-credentials) | [Schema Creation](https://docs.moca.network/airkit/usage/credential/schema-creation) | [Issue on Behalf](https://docs.moca.network/airkit/usage/credential/issue-on-behalf)`;
}

function buildVerificationSteps(): string {
  const dashboardUrl = getCredentialDashboardUrl();
  return `## Quickstart 3: Verify Credentials (MCP + app)

This flow is aligned with [AIR Kit Quickstart: Credential Verification](https://docs.moca.network/airkit/quickstart/verify-credentials).

### Before starting
- Node.js v16+
- Credentials to verify (e.g. from [Credential Issuance Quickstart](https://docs.moca.network/airkit/quickstart/issue-credentials))
- (Recommended) [Login & Sessions Quickstart](https://docs.moca.network/airkit/quickstart/)

### MCP setup (verification programs)

1. **Connect (auth)** – Connect to the MCP server in Cursor (Connect/Start or HTTP OAuth). Session stores verifierId and verifierDid.

2. **Schema** – Use a published schema (create via issuance flow or existing). Use its \`schemaId\` when creating programs.

3. **Create verification programs** – \`credential_create_verification_programs\`:
   - \`programs\`: each with \`programName\` and \`conditions\` (attribute, operator: ">" | ">=" | "<" | "<=" | "=" | "!=", value).
   - Use returned program IDs as \`programId\` in the SDK. \`deploy: true\` (default) to make programs active.

### Prerequisites (Dashboard)
- Verifier → Fee wallet funded; [Faucet](https://devnet-scan.mocachain.org/faucet) for test tokens.

### In your app (production standards)

- **Install:** \`npm install @mocanetwork/airkit\`
- **Config:** Partner ID and Verifier DID from [Developer Dashboard → Account → General](${dashboardUrl}/dashboard/general). \`programId\` from Verifier → Programs.
- **JWT:** For production, **generate JWTs on the backend** to keep private keys secure. [Partner Authentication](https://docs.moca.network/airkit/usage/partner-authentication). Configure JWKS URL in Dashboard.
- **Verify:** \`airService.verifyCredential({ authToken: jwt, programId, redirectUrl })\`. \`redirectUrl\` (redirectUrlForIssuer) used when user has no credential and should be sent to issue one.
- **Status:** \`result.status === "Compliant"\` → success (zkProofs, transactionHash; optionally \`cakPrivateKey\` for compliance decryption). \`"Non-Compliant"\` or other status → handle accordingly.

**Docs:** [Quickstart: Verify Credentials](https://docs.moca.network/airkit/quickstart/verify-credentials) | [Credentials Overview](https://docs.moca.network/airkit/usage/credential/credentials-flow)`;
}

export async function credentialDocs(args: z.infer<typeof CredentialDocsArgsSchema>) {
  const validated = CredentialDocsArgsSchema.parse(args);
  const flow = validated.flow;

  let markdown: string;
  if (flow === 'issuance') {
    markdown = buildIssuanceSteps();
  } else if (flow === 'verification') {
    markdown = buildVerificationSteps();
  } else {
    markdown = `${buildIssuanceSteps()}\n\n---\n\n${buildVerificationSteps()}`;
  }

  return {
    flow,
    markdown,
    message: `Use these steps and run the corresponding MCP tools. Ask if you want to run a specific step.`,
  };
}
