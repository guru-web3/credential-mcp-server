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
  branch: z.string().optional().describe('Optional branch (e.g. mcp/template, sample/passport-age)'),
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
      detail: 'Run the key-generation commands from credential_issuance_app_config (or credential_verifier_app_config), then write PARTNER_PRIVATE_KEY and NEXT_PUBLIC_PARTNER_PUBLIC_KEY to .env.local. Call the MCP config tool to get the full env snippet. The issuance template does not require editing app/(home)/api/user/user-data/route.ts: when a credential has dataPoints in NEXT_PUBLIC_CREDENTIALS_CONFIG but no custom builder is registered, the route automatically returns a mock user-data API response based on those dataPoints.',
      commands: [],
    },
    { step: 4, title: 'Run dev server', commands: ['pnpm dev'], detail: 'Open http://localhost:3000. For local HTTPS use pnpm dev:https (https://localhost:3000).' },
    {
      step: 5,
      title: 'Local JWKS testing (optional, before deploy)',
      detail:
        'For issuance: call credential_configure_issuer_jwks with origin (e.g. https://localhost:3000 or your tunnel URL like https://abc.ngrok.io). The tool probes the JWKS endpoint, then sets JWKS URL and whitelist in the dashboard. For testing with the cloud credential API use a tunnel (e.g. npx ngrok http 3000) and pass the tunnel URL as origin.',
      commands: [],
    },
    { step: 6, title: 'Build for production', commands: ['pnpm build', 'pnpm start'] },
    {
      step: 7,
      title: 'Deploy',
      detail: 'Deploy to Vercel or Netlify; add all .env.local variables to the host. Use the same PARTNER_PRIVATE_KEY and public key.',
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
    summary: 'Clone with branch → install → generate keys and paste env → dev → (optional) configure JWKS via credential_configure_issuer_jwks → build → deploy → set JWKS URL for production.',
  };
}
