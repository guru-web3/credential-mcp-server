/**
 * Execute an MCP tool by name with normalized args.
 * Used by both the MCP CallTool handler and the dashboard chat loop.
 * Session must already be set (e.g. via setSessionFromAuthInfo) before calling.
 */
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
import { normalizeToolArgs } from './normalizeToolArgs.js';

export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const normalized = normalizeToolArgs(name, args);

  switch (name) {
    case 'credential_authenticate': {
      const validated = AuthenticateArgsSchema.parse(normalized);
      return await authenticate(validated);
    }
    case 'credential_get_login_challenge': {
      const validated = GetLoginChallengeArgsSchema.parse(normalized);
      return await getLoginChallenge(validated);
    }
    case 'credential_create_schema': {
      const validated = CreateSchemaArgsSchema.parse(normalized);
      return await createSchema(validated);
    }
    case 'credential_verify_schema_published': {
      const validated = VerifySchemaPublishedArgsSchema.parse(normalized);
      return await verifySchemaPublished(validated);
    }
    case 'credential_create_program': {
      const validated = CreateCredentialTemplateArgsSchema.parse(normalized);
      return await createCredentialTemplate(validated);
    }
    case 'credential_setup_pricing': {
      const validated = SetupPricingArgsSchema.parse(normalized);
      return await setupPricing(validated);
    }
    case 'credential_create_verification_programs': {
      const validated = CreateProgramsArgsSchema.parse(normalized);
      return await createVerificationPrograms(validated);
    }
    case 'credential_list_templates': {
      const validated = ListCredentialTemplatesArgsSchema.parse(normalized);
      return await listCredentialTemplates(validated);
    }
    case 'credential_list_programs': {
      const validated = ListVerificationProgramsArgsSchema.parse(normalized);
      return await listVerificationPrograms(validated);
    }
    case 'credential_docs': {
      const validated = CredentialDocsArgsSchema.parse(normalized);
      return await credentialDocs(validated);
    }
    case 'credential_list_schemas': {
      const validated = ListSchemasArgsSchema.parse(normalized);
      return await listSchemas(validated);
    }
    case 'credential_template_info': {
      const validated = TemplateInfoArgsSchema.parse(normalized);
      return await getTemplateInfo(validated);
    }
    case 'credential_issuance_app_config': {
      const validated = IssuanceAppConfigArgsSchema.parse(normalized);
      return await getIssuanceAppConfig(validated);
    }
    case 'credential_verifier_app_config': {
      const validated = VerifierAppConfigArgsSchema.parse(normalized);
      return await getVerifierAppConfig(validated);
    }
    case 'credential_app_steps': {
      const validated = AppStepsArgsSchema.parse(normalized);
      return await getAppSteps(validated);
    }
    case 'credential_configure_issuer_jwks': {
      const validated = ConfigureIssuerJwksArgsSchema.parse(normalized);
      return await configureIssuerJwks(validated);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
