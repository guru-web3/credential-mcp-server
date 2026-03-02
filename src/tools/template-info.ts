/**
 * Template info: repo URL, branch, clone command for issuance and verifier apps.
 * No auth required.
 */

import { z } from 'zod';

export const TemplateInfoArgsSchema = z.object({
  appType: z
    .union([
      z.enum(['issuance', 'verifier']),
      z.string().transform((s) => (String(s).toLowerCase().includes('verif') ? 'verifier' : 'issuance')),
    ])
    .describe('issuance or verifier template'),
  branch: z.string().optional().describe('Optional branch (default: mcp-template for issuance, main for verifier)'),
});

export type TemplateInfoArgs = z.infer<typeof TemplateInfoArgsSchema>;

const ISSUANCE_REPO = 'https://github.com/mocaverse/air-credential-issuance-template';
const DEFAULT_ISSUANCE_BRANCH = 'mcp-template';
const VERIFIER_REPO = 'https://github.com/mocaverse/air-credential-verifier-template';
const DEFAULT_VERIFIER_BRANCH = 'main';

export async function getTemplateInfo(args: TemplateInfoArgs) {
  const { appType, branch } = TemplateInfoArgsSchema.parse(args);

  if (appType === 'issuance') {
    const b = branch ?? DEFAULT_ISSUANCE_BRANCH;
    return {
      appType: 'issuance',
      repoUrl: ISSUANCE_REPO,
      branch: b,
      cloneCommand: `git clone -b ${b} ${ISSUANCE_REPO}.git`,
      description: 'Next.js issuance template; multi-schema support, config-driven credentials.',
      readmeLink: `${ISSUANCE_REPO}#readme`,
      alternativeBranches: ['nansen-staging', 'sample/passport-age'],
      issuanceFlowHint:
        'Use with credential_app_steps (appType: issuance) and credential_issuance_app_config for the full issuance setup: clone → install → env + generate-keys → dev → npx instatunnel 3000 → credential_configure_issuer_jwks.',
    };
  }

  const b = branch ?? DEFAULT_VERIFIER_BRANCH;
  return {
    appType: 'verifier',
    repoUrl: VERIFIER_REPO,
    branch: b,
    cloneCommand: `git clone -b ${b} ${VERIFIER_REPO}.git`,
    description: 'Next.js verifier template for credential verification.',
    readmeLink: `${VERIFIER_REPO}#readme`,
  };
}
