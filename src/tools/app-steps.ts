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
    { step: 4, title: 'Run dev server', commands: ['pnpm dev'], detail: 'Open http://localhost:3000' },
    { step: 5, title: 'Build for production', commands: ['pnpm build', 'pnpm start'] },
    {
      step: 6,
      title: 'Deploy',
      detail: 'Deploy to Vercel or Netlify; add all .env.local variables to the host. Use the same PARTNER_PRIVATE_KEY and public key.',
    },
    {
      step: 7,
      title: 'Post-deploy: JWKS and domain',
      detail: `For issuance: set JWKS URL in the credential Partner Dashboard to https://<your-deployed-origin>/jwks.json (kid defaults to partner ID). Whitelist your domain in the dashboard.`,
    },
  ];

  return {
    appType,
    branch: info.branch,
    repoUrl: info.repoUrl,
    steps,
    summary: 'Clone with branch → install → generate keys and paste env → dev → build → deploy → set JWKS URL in dashboard.',
  };
}
