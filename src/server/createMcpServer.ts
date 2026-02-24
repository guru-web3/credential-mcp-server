import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { getRequestAuth } from '../auth/requestContext.js';
import { setSessionFromAuthInfo } from '../auth/setSessionFromAuthInfo.js';
import { authenticate, AuthenticateArgsSchema } from '../tools/authenticate.js';
import { getLoginChallenge, GetLoginChallengeArgsSchema } from '../tools/get-login-challenge.js';
import { createSchema, CreateSchemaArgsSchema } from '../tools/create-schema.js';
import { createCredentialTemplate, CreateCredentialTemplateArgsSchema } from '../tools/create-credential-template.js';
import { setupPricing, SetupPricingArgsSchema } from '../tools/setup-pricing.js';
import { createVerificationPrograms, CreateProgramsArgsSchema } from '../tools/create-programs.js';
import { verifySchemaPublished, VerifySchemaPublishedArgsSchema } from '../tools/verify-schema-published.js';
import { listCredentialTemplates, ListCredentialTemplatesArgsSchema } from '../tools/list-credential-templates.js';
import { listVerificationPrograms, ListVerificationProgramsArgsSchema } from '../tools/list-verification-programs.js';
import { credentialDocs, CredentialDocsArgsSchema } from '../tools/credential-docs.js';
import { listSchemas, ListSchemasArgsSchema } from '../tools/list-schemas.js';
import { getTemplateInfo, TemplateInfoArgsSchema } from '../tools/template-info.js';
import { getIssuanceAppConfig, IssuanceAppConfigArgsSchema } from '../tools/issuance-app-config.js';
import { getVerifierAppConfig, VerifierAppConfigArgsSchema } from '../tools/verifier-app-config.js';
import { getAppSteps, AppStepsArgsSchema } from '../tools/app-steps.js';
import { configureIssuerJwks, ConfigureIssuerJwksArgsSchema } from '../tools/configure-issuer-jwks.js';

import { TOOLS_LIST } from './toolsList.js';
import { normalizeToolArgs } from './normalizeToolArgs.js';

export function createMcpServer(): { server: Server } {
  const server = new Server(
    {
      name: 'animoca-credentials',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS_LIST,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const auth = getRequestAuth();
    if (auth) setSessionFromAuthInfo(auth);

    const { name, arguments: args } = request.params;
    const normalized = normalizeToolArgs(name, (args ?? {}) as Record<string, unknown>);

    try {
      let result: unknown;

      switch (name) {
        case 'credential_authenticate': {
          const validated = AuthenticateArgsSchema.parse(normalized);
          result = await authenticate(validated);
          break;
        }
        case 'credential_get_login_challenge': {
          const validated = GetLoginChallengeArgsSchema.parse(normalized);
          result = await getLoginChallenge(validated);
          break;
        }
        case 'credential_create_schema': {
          const validated = CreateSchemaArgsSchema.parse(normalized);
          result = await createSchema(validated);
          break;
        }
        case 'credential_verify_schema_published': {
          const validated = VerifySchemaPublishedArgsSchema.parse(normalized);
          result = await verifySchemaPublished(validated);
          break;
        }
        case 'credential_create_program': {
          const validated = CreateCredentialTemplateArgsSchema.parse(normalized);
          result = await createCredentialTemplate(validated);
          break;
        }
        case 'credential_setup_pricing': {
          const validated = SetupPricingArgsSchema.parse(normalized);
          result = await setupPricing(validated);
          break;
        }
        case 'credential_create_verification_programs': {
          const validated = CreateProgramsArgsSchema.parse(normalized);
          result = await createVerificationPrograms(validated);
          break;
        }
        case 'credential_list_templates': {
          const validated = ListCredentialTemplatesArgsSchema.parse(normalized);
          result = await listCredentialTemplates(validated);
          break;
        }
        case 'credential_list_programs': {
          const validated = ListVerificationProgramsArgsSchema.parse(normalized);
          result = await listVerificationPrograms(validated);
          break;
        }
        case 'credential_docs': {
          const validated = CredentialDocsArgsSchema.parse(normalized);
          result = await credentialDocs(validated);
          break;
        }
        case 'credential_list_schemas': {
          const validated = ListSchemasArgsSchema.parse(normalized);
          result = await listSchemas(validated);
          break;
        }
        case 'credential_template_info': {
          const validated = TemplateInfoArgsSchema.parse(normalized);
          result = await getTemplateInfo(validated);
          break;
        }
        case 'credential_issuance_app_config': {
          const validated = IssuanceAppConfigArgsSchema.parse(normalized);
          result = await getIssuanceAppConfig(validated);
          break;
        }
        case 'credential_verifier_app_config': {
          const validated = VerifierAppConfigArgsSchema.parse(normalized);
          result = await getVerifierAppConfig(validated);
          break;
        }
        case 'credential_app_steps': {
          const validated = AppStepsArgsSchema.parse(normalized);
          result = await getAppSteps(validated);
          break;
        }
        case 'credential_configure_issuer_jwks': {
          const validated = ConfigureIssuerJwksArgsSchema.parse(normalized);
          result = await configureIssuerJwks(validated);
          break;
        }
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              { success: false, error: message, tool: name },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  });

  return { server };
}
