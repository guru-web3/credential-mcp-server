/**
 * Generate .env snippet for the verifier template from session + optional program ID.
 * Requires auth.
 */

import { z } from 'zod';
import { session } from '../session.js';
import { listVerificationPrograms } from './list-verification-programs.js';

export const VerifierAppConfigArgsSchema = z.object({
  programId: z.string().optional().describe('Verification program ID. If omitted, uses first program from list or session.'),
});

export type VerifierAppConfigArgs = z.infer<typeof VerifierAppConfigArgsSchema>;

export async function getVerifierAppConfig(args: VerifierAppConfigArgs) {
  session.requireAuth();

  const partnerId = session.get('partnerId');
  if (!partnerId) {
    throw new Error('Session missing partnerId. Re-authenticate with credential_authenticate.');
  }

  let programId = args?.programId ?? session.get('programIds')?.[0];
  if (!programId) {
    const { programs } = await listVerificationPrograms({ page: 1, size: 1, sortField: 'uvpi.create_at', order: 'desc' });
    const first = programs?.[0];
    if (first?.id) programId = first.id;
  }

  const envLines = [
    `# Verifier app env — paste into .env.local`,
    `NEXT_PUBLIC_PARTNER_ID=${partnerId}`,
    programId ? `NEXT_PUBLIC_VERIFIER_PROGRAM_ID=${programId}` : `# NEXT_PUBLIC_VERIFIER_PROGRAM_ID=`,
    `NEXT_PUBLIC_ISSUER_URL=`,
    `NEXT_PUBLIC_SITE_NAME=Credential Verifier`,
    `NEXT_PUBLIC_SITE_DESCRIPTION=Verify credentials`,
    `NEXT_PUBLIC_BUILD_ENV=staging`,
    `NEXT_PUBLIC_THEME=system`,
    `# PARTNER_PRIVATE_KEY= — generate (same as issuance)`,
    `SIGNING_ALGORITHM=ES256`,
  ];

  return {
    envSnippet: envLines.join('\n'),
    notes: 'Generate PARTNER_PRIVATE_KEY and set in .env.local. After deploy, whitelist your domain in the dashboard.',
    partnerId,
    programId: programId ?? null,
  };
}
