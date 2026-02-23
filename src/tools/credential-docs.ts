/**
 * Return structured docs and steps for issuance and/or verification.
 * Helps developers and AI follow the right flow without leaving the IDE.
 */

import { z } from 'zod';

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

const ISSUANCE_STEPS = `## Issuance flow (MCP-first)

1. **Authenticate** – Recommended: call \`credential_get_login_challenge\` with the user’s wallet address, have them open the signer URL and sign, then \`credential_authenticate\` with the signed JSON (credentialsJson). Alternative: \`credential_authenticate\` with privateKey and environment (staging|production). Saves partnerId, issuerId, issuerDid.
2. **Create schema** – \`credential_create_schema\` (schemaName, schemaType, dataPoints). Saves schemaId; schema is published when created.
3. **Verify schema** – \`credential_verify_schema_published\` (schemaId optional). Confirms schema is published and accessible.
4. **Create program** – \`credential_create_program\` (credentialName, schemeType, schemeTitle, expirationDuration, issueMax, ...). This is your **issuance program**; use returned programId as \`credentialId\` in SDK.
5. **Set pricing** – \`credential_setup_pricing\` (schemaId, pricingModel, priceUsd optional default 0, cakEnabled, paymentFeeSchemaId optional).
6. **In your app** – Use Issuer DID + program ID with AIR Kit \`airService.issueCredential\` or Issue on Behalf API.

**Docs:** [Quickstart: Issue Credentials](https://docs.moca.network/airkit/quickstart/issue-credentials) | [Schema Creation](https://docs.moca.network/airkit/usage/credential/schema-creation) | [Issue on Behalf](https://docs.moca.network/airkit/usage/credential/issue-on-behalf)`;

const VERIFICATION_STEPS = `## Verification flow (MCP-first)

1. **Authenticate** – Same as issuance: recommended wallet-address flow via \`credential_get_login_challenge\` then \`credential_authenticate\` with signed JSON; or \`credential_authenticate\` with privateKey. Saves verifierId, verifierDid.
2. **Schema** – You need a published schema (create via issuance flow or use existing). Use its schemaId for programs.
3. **Create programs** – \`credential_create_verification_programs\` (schemaId, programs: [{ programName, conditions }]). Conditions: attribute, operator ('>','>=','<','<=','=','!='), value.
4. **Apply/deploy** – If your program stays in Draft, apply it in the dashboard (Verifier → Programs → Details → Apply) or confirm whether create already activates it.
5. **In your app** – Use Verifier DID + program ID with AIR Kit \`airService.verifyCredential\` (programId, redirectUrlForIssuer).

**Docs:** [Quickstart: Verify Credentials](https://docs.moca.network/airkit/quickstart/verify-credentials) | [Credentials Overview](https://docs.moca.network/airkit/usage/credential/credentials-flow)`;

export async function credentialDocs(args: z.infer<typeof CredentialDocsArgsSchema>) {
  const validated = CredentialDocsArgsSchema.parse(args);
  const flow = validated.flow;

  let markdown: string;
  if (flow === 'issuance') {
    markdown = ISSUANCE_STEPS;
  } else if (flow === 'verification') {
    markdown = VERIFICATION_STEPS;
  } else {
    markdown = `${ISSUANCE_STEPS}\n\n---\n\n${VERIFICATION_STEPS}`;
  }

  return {
    flow,
    markdown,
    message: `Use these steps and run the corresponding MCP tools. Ask if you want to run a specific step.`,
  };
}
