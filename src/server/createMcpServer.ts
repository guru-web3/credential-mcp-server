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

import { TOOLS_LIST } from './toolsList.js';

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

    try {
      let result: unknown;

      switch (name) {
        case 'credential_authenticate': {
          const validated = AuthenticateArgsSchema.parse(args ?? {});
          result = await authenticate(validated);
          break;
        }
        case 'credential_get_login_challenge': {
          const validated = GetLoginChallengeArgsSchema.parse(args ?? {});
          result = await getLoginChallenge(validated);
          break;
        }
        case 'credential_create_schema': {
          const validated = CreateSchemaArgsSchema.parse(args);
          result = await createSchema(validated);
          break;
        }
        case 'credential_verify_schema_published': {
          const validated = VerifySchemaPublishedArgsSchema.parse(args);
          result = await verifySchemaPublished(validated);
          break;
        }
        case 'credential_create_program': {
          const validated = CreateCredentialTemplateArgsSchema.parse(args);
          result = await createCredentialTemplate(validated);
          break;
        }
        case 'credential_setup_pricing': {
          const validated = SetupPricingArgsSchema.parse(args);
          result = await setupPricing(validated);
          break;
        }
        case 'credential_create_verification_programs': {
          const validated = CreateProgramsArgsSchema.parse(args);
          result = await createVerificationPrograms(validated);
          break;
        }
        case 'credential_list_templates': {
          const validated = ListCredentialTemplatesArgsSchema.parse(args ?? {});
          result = await listCredentialTemplates(validated);
          break;
        }
        case 'credential_list_programs': {
          const validated = ListVerificationProgramsArgsSchema.parse(args ?? {});
          result = await listVerificationPrograms(validated);
          break;
        }
        case 'credential_docs': {
          const validated = CredentialDocsArgsSchema.parse(args ?? {});
          result = await credentialDocs(validated);
          break;
        }
        case 'credential_list_schemas': {
          const validated = ListSchemasArgsSchema.parse(args ?? {});
          result = await listSchemas(validated);
          break;
        }
        case 'credential_template_info': {
          const validated = TemplateInfoArgsSchema.parse(args ?? {});
          result = await getTemplateInfo(validated);
          break;
        }
        case 'credential_issuance_app_config': {
          const validated = IssuanceAppConfigArgsSchema.parse(args ?? {});
          result = await getIssuanceAppConfig(validated);
          break;
        }
        case 'credential_verifier_app_config': {
          const validated = VerifierAppConfigArgsSchema.parse(args ?? {});
          result = await getVerifierAppConfig(validated);
          break;
        }
        case 'credential_app_steps': {
          const validated = AppStepsArgsSchema.parse(args ?? {});
          result = await getAppSteps(validated);
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
