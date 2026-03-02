/**
 * MCP Prompts: list and get by name + arguments.
 * Prompts are templated workflows (setup_issuance, setup_verifier, create_schema_from_description, issue_and_verify_quickstart).
 */

import { getAppSteps } from '../tools/app-steps.js';
import { credentialDocs } from '../tools/credential-docs.js';

export const PROMPT_DEFINITIONS = [
  {
    name: 'setup_issuance',
    description: 'Full flow: clone issuance template, generate .env.local (from template ID), mock from schema dataPoints, dev, tunnel, configure JWKS, test at localhost:3000. Pass credentialTemplateId for env; optional branch.',
    arguments: [
      { name: 'branch', description: 'Optional branch (e.g. mcp-template, sample/passport-age)', required: false },
      { name: 'credentialTemplateId', description: 'Credential template/program ID for credential_issuance_app_config (env + schema dataPoints for mocking)', required: false },
    ],
  },
  {
    name: 'setup_verifier',
    description: 'Step-by-step guide to set up the credential verifier app: clone, install, env, dev, deploy.',
    arguments: [
      { name: 'branch', description: 'Optional branch', required: false },
      { name: 'programId', description: 'Optional verification program ID for env config', required: false },
    ],
  },
  {
    name: 'create_schema_from_description',
    description: 'Guidance to create a credential schema from a natural language description (use credential_create_schema with derived schemaName, schemaType, dataPoints).',
    arguments: [{ name: 'description', description: 'What the credential should represent (e.g. trading volume tier)', required: true }],
  },
  {
    name: 'issue_and_verify_quickstart',
    description: 'Short quickstart covering both issuance and verification flows (AIR Kit Quickstart 2 & 3).',
    arguments: [{ name: 'flow', description: 'Optional: issuance | verification | both', required: false }],
  },
] as const;

export function listPrompts(): { name: string; description?: string; arguments?: { name: string; description?: string; required?: boolean }[] }[] {
  return PROMPT_DEFINITIONS.map(({ name, description, arguments: args }) => ({
    name,
    description,
    arguments: args?.map((a) => ({ name: a.name, description: a.description, required: a.required })),
  }));
}

export async function getPrompt(
  name: string,
  args: Record<string, string> = {}
): Promise<{ description?: string; messages: { role: 'user' | 'assistant'; content: { type: 'text'; text: string } }[] }> {
  switch (name) {
    case 'setup_issuance': {
      const branch = args.branch ?? undefined;
      const credentialTemplateId = args.credentialTemplateId ?? undefined;
      const steps = await getAppSteps({ appType: 'issuance', branch });
      const cloneCommand = steps.steps[0]?.commands?.[0] ?? `git clone -b ${steps.branch} ${steps.repoUrl}.git`;
      const templateIdLine = credentialTemplateId
        ? `**Template ID:** Use \`credential_issuance_app_config\` with \`credentialTemplateId: "${credentialTemplateId}"\` to get .env.local (includes schema dataPoints for mocking). If keys not given, run pnpm run generate-keys and populate. Paste the full snippet including NEXT_PUBLIC_CREDENTIALS_CONFIG and dataPoints. Don't edit the user-data route when only mocking; mock by type: string → "test", integer/number → 0, boolean → false. Add a TODO in app/(home)/api/user/user-data/route.ts for a real API later.`
        : `**Env:** Call \`credential_issuance_app_config\` (optionally with \`credentialTemplateId\`) to get .env.local. If keys not given, run generate-keys and populate. Paste the full snippet including NEXT_PUBLIC_CREDENTIALS_CONFIG and dataPoints. Default when no API: use built-in mock, mock by type (string→"test", number→0, boolean→false), add TODO in app/(home)/api/user/user-data/route.ts.`;
      const text = [
        `# Setup credential issuance app (full flow: clone → env → mock → dev → tunnel → JWKS → test)`,
        ``,
        `**Repo:** ${steps.repoUrl} (branch: ${steps.branch}). See the template **README** and **tunnel.md** (or **docs/TUNNEL-AND-JWKS.md**) in the repo.`,
        `**Clone:** \`${cloneCommand}\``,
        ``,
        templateIdLine,
        ``,
        `**Tunnel + JWKS:** Run the app (\`pnpm dev\`) on port 3000—kill anything already using that port. In a second terminal run \`pnpm tunnel\` or \`npx instatunnel 3000\`. Pick the tunnel HTTPS URL only after both the app and the tunnel are running. Call \`credential_configure_issuer_jwks\` with that URL as \`origin\` (no localhost). Then open http://localhost:3000 to test. Default: if no endpoint/tunnel is configured, use this for local e2e.`,
        ``,
        ...steps.steps.map(
          (s) =>
            `## ${s.step}. ${s.title}` +
            (s.detail ? `\n${s.detail}` : '') +
            (s.commands?.length ? `\n\`\`\`\n${s.commands.join('\n')}\n\`\`\`` : '')
        ),
        ``,
        steps.summary,
      ].join('\n');
      return { description: 'Issuance app setup steps', messages: [{ role: 'user', content: { type: 'text', text } }] };
    }
    case 'setup_verifier': {
      const branch = args.branch ?? undefined;
      const steps = await getAppSteps({ appType: 'verifier', branch });
      const cloneCommand = steps.steps[0]?.commands?.[0] ?? `git clone -b ${steps.branch} ${steps.repoUrl}.git`;
      const text = [
        `# Setup credential verifier app`,
        ``,
        `**Repo:** ${steps.repoUrl} (branch: ${steps.branch})`,
        `**Clone:** \`${cloneCommand}\``,
        ``,
        ...steps.steps.map(
          (s) =>
            `## ${s.step}. ${s.title}` +
            (s.detail ? `\n${s.detail}` : '') +
            (s.commands?.length ? `\n\`\`\`\n${s.commands.join('\n')}\n\`\`\`` : '')
        ),
        ``,
        steps.summary,
      ].join('\n');
      return { description: 'Verifier app setup steps', messages: [{ role: 'user', content: { type: 'text', text } }] };
    }
    case 'create_schema_from_description': {
      const description = args.description ?? 'a custom credential';
      const text = [
        `Create a credential schema for: "${description}".`,
        ``,
        `Use the MCP tool \`credential_create_schema\` with:`,
        `- **schemaName**: kebab-case (e.g. trading-volume-credential)`,
        `- **schemaType**: PascalCase, alphanumeric, unique (e.g. tradingVolumeCredential)`,
        `- **dataPoints**: array of { name, type: "string"|"integer"|"number"|"boolean", description? }`,
        ``,
        `Derive attribute names and types from the description. Ask the user for confirmation before calling the tool if the description is ambiguous.`,
      ].join('\n');
      return { description: 'Guidance to create schema from description', messages: [{ role: 'user', content: { type: 'text', text } }] };
    }
    case 'issue_and_verify_quickstart': {
      const flow = (args.flow ?? 'both').toLowerCase();
      const flowParam = flow === 'verification' ? 'verification' : flow === 'issuance' ? 'issuance' : 'both';
      const result = await credentialDocs({ flow: flowParam });
      const text = result.markdown;
      return {
        description: 'Quickstart for issuance and/or verification',
        messages: [{ role: 'user', content: { type: 'text', text } }],
      };
    }
    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
}
