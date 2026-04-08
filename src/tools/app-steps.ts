/**
 * Ordered develop-to-deploy steps for issuance or verifier app.
 * Includes clone (with branch), install, generate keys + env, dev, build, deploy, JWKS URL.
 */

import { z } from 'zod';
import { getTemplateInfo } from './template-info.js';

export const AppStepsArgsSchema = z.object({
  appType: z
    .union([
      z.enum(['issuance', 'verifier']),
      z.string().transform((s) => (String(s).toLowerCase().includes('verif') ? 'verifier' : 'issuance')),
    ])
    .describe('issuance or verifier'),
  branch: z.string().optional().describe('Optional branch (e.g. mcp-template, sample/passport-age)'),
});

export type AppStepsArgs = z.infer<typeof AppStepsArgsSchema>;

export async function getAppSteps(args: AppStepsArgs) {
  const { appType, branch } = AppStepsArgsSchema.parse(args);
  const info = await getTemplateInfo({ appType, branch });

  const steps = [
    { step: 1, title: 'Clone repo', commands: [info.cloneCommand], link: info.readmeLink },
    { step: 2, title: 'Install dependencies', commands: ['cd <repo-dir>', 'pnpm install'] },
    {
      step: 3,
      title: 'Generate keys and set env',
      detail:
        'Call credential_issuance_app_config to get the full .env snippet. Default: if NEXT_PUBLIC_PARTNER_PUBLIC_KEY or PARTNER_PRIVATE_KEY is not given, run pnpm run generate-keys and populate .env.local. When writing .env.local: paste the entire snippet including NEXT_PUBLIC_CREDENTIALS_CONFIG with dataPoints (do not remove dataPoints or the built-in mock will not work). Do not edit app/(home)/api/user/user-data/route.ts when only mocking; rely on the built-in mock. Mock by type: string → "test", integer/number → 0, boolean → false. Add a TODO in app/(home)/api/user/user-data/route.ts for plugging in a real API later. See MCP docs "User data and mocking" and mcp-issuance.md for default behaviors.',
      commands: [],
    },
    {
      step: 4,
      title: 'Run dev server',
      commands: ['pnpm dev'],
      detail:
        'Run pnpm dev; ensure port 3000 is in use (kill any process already using it if needed). Open http://localhost:3000. For local HTTPS use pnpm dev:https (https://localhost:3000).',
    },
    {
      step: 5,
      title: 'Local JWKS testing (optional, before deploy)',
      detail:
        'For issuance: run pnpm dev (port 3000), then in another terminal run pnpm tunnel or npx instatunnel 3000. Pick the tunnel HTTPS URL only after both the app and the tunnel are running. Call credential_configure_issuer_jwks with that URL as origin (no trailing slash). Do not use localhost for JWKS. Default: when no endpoint/tunnel is configured, use this for local e2e testing.',
      commands: ['npx instatunnel 3000'],
    },
    { step: 6, title: 'Build for production', commands: ['pnpm build', 'pnpm start'] },
    {
      step: 7,
      title: 'Deploy',
      detail:
        'Deploy to Vercel or Netlify; add all .env.local variables to the host. Use the same PARTNER_PRIVATE_KEY and public key.',
    },
    {
      step: 8,
      title: 'Post-deploy: JWKS and domain',
      detail:
        'For issuance: call credential_configure_issuer_jwks with your deployed origin, or in the credential Partner Dashboard set JWKS URL to https://<your-deployed-origin>/jwks.json and whitelist your domain.',
    },
  ];

  return {
    appType,
    branch: info.branch,
    repoUrl: info.repoUrl,
    steps,
    summary:
      appType === 'issuance'
        ? 'Clone with branch → install → credential_issuance_app_config + pnpm run generate-keys (strict replace env) → dev → npx instatunnel 3000 → credential_configure_issuer_jwks → build → deploy → set JWKS URL for production.'
        : 'Clone with branch → install → generate keys and paste env → dev → (optional) configure JWKS → build → deploy → set JWKS URL for production.',
  };
}
