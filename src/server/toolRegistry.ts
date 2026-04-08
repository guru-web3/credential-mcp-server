/**
 * Central tool registry: single source of truth for tools/list and tools/call.
 * Add new tools here only; no switch in createMcpServer.
 */

import type { z } from 'zod';
import { createSchema, CreateSchemaArgsSchema } from '../tools/create-schema.js';
import { createCredentialTemplate, CreateCredentialTemplateArgsSchema } from '../tools/create-credential-template.js';
import { setupPricing, SetupPricingArgsSchema } from '../tools/setup-pricing.js';
import { createVerificationPrograms, CreateProgramsArgsSchema } from '../tools/create-programs.js';
import { listCredentialTemplates, ListCredentialTemplatesArgsSchema } from '../tools/list-credential-templates.js';
import { listVerificationPrograms, ListVerificationProgramsArgsSchema } from '../tools/list-verification-programs.js';
import { credentialDocs, CredentialDocsArgsSchema } from '../tools/credential-docs.js';
import { listSchemas, ListSchemasArgsSchema } from '../tools/list-schemas.js';
import { getTemplateInfo, TemplateInfoArgsSchema } from '../tools/template-info.js';
import { getIssuanceAppConfig, IssuanceAppConfigArgsSchema } from '../tools/issuance-app-config.js';
import { getVerifierAppConfig, VerifierAppConfigArgsSchema } from '../tools/verifier-app-config.js';
import { getAppSteps, AppStepsArgsSchema } from '../tools/app-steps.js';
import { configureIssuerJwks, ConfigureIssuerJwksArgsSchema } from '../tools/configure-issuer-jwks.js';
import { setPrice, SetPriceArgsSchema } from '../tools/set-price.js';
import {
  paymentDeposit,
  paymentWithdraw,
  paymentClaimFees,
  PaymentDepositArgsSchema,
  PaymentWithdrawArgsSchema,
  PaymentClaimFeesArgsSchema,
} from '../tools/payment-onchain.js';
import {
  stakeMoca,
  unstakeMoca,
  claimUnstakeMoca,
  StakeMocaArgsSchema,
  UnstakeMocaArgsSchema,
  ClaimUnstakeMocaArgsSchema,
} from '../tools/staking-onchain.js';
import { x402PayAndVerify, X402PayAndVerifyArgsSchema } from '../tools/x402-pay-and-verify.js';

/** MCP tool list item (name, description, inputSchema). */
export type ToolListEntry = {
  name: string;
  description: string;
  inputSchema: { type: 'object'; properties?: Record<string, unknown>; required?: readonly string[] };
};

/** Registry entry: list shape + Zod schema + async handler. */
export type ToolRegistryEntry = ToolListEntry & {
  schema: z.ZodType;
  handler: (args: unknown) => Promise<unknown>;
};

const TOOL_ENTRIES: ToolRegistryEntry[] = [
  {
    name: 'credential_create_schema',
    description:
      'Create and publish a new credential schema with specified data points. Returns schema ID for use in pricing and program creation.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        schemaName: { type: 'string' as const, description: 'Schema name (e.g., trading-volume-credential)' },
        schemaType: {
          type: 'string' as const,
          description: 'Schema type identifier (e.g., tradingVolumeCredential). Must be unique.',
        },
        dataPoints: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              name: { type: 'string' as const, description: 'Attribute name' },
              type: {
                type: 'string' as const,
                enum: ['string', 'integer', 'number', 'boolean'],
                description: 'Data type',
              },
              description: { type: 'string' as const, description: 'Attribute description (optional)' },
            },
            required: ['name', 'type'],
          },
          description: 'List of data points/attributes',
        },
        description: { type: 'string' as const, description: 'Schema description (optional)' },
        version: { type: 'string' as const, default: '1.0', description: 'Schema version' },
      },
      required: ['schemaName', 'schemaType', 'dataPoints'] as const,
    },
    schema: CreateSchemaArgsSchema,
    handler: (args) => createSchema(CreateSchemaArgsSchema.parse(args)),
  },
  {
    name: 'credential_create_program',
    description:
      'Create an issuance program (credential template). Pass schemaId to fill schemeType, schemeTitle and credentialName from the schema; otherwise provide them or use session schemaId.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        schemaId: {
          type: 'string' as const,
          description:
            'Schema ID. When provided, schemeType, schemeTitle and credentialName are fetched from the schema if omitted.',
        },
        credentialName: {
          type: 'string' as const,
          description: 'Name of the credential. Defaults to schema title when schemaId is provided.',
        },
        schemeType: {
          type: 'string' as const,
          description: 'Schema type identifier. Filled from schema when schemaId is provided.',
        },
        schemeTitle: {
          type: 'string' as const,
          description: 'Schema title. Filled from schema when schemaId is provided.',
        },
        expirationDuration: { type: 'number' as const, description: 'Expiration duration in days (default: 365)' },
        issueMax: {
          type: ['number', 'null'] as const,
          description: 'Maximum number of credentials to issue (null for unlimited)',
        },
        accessibleStartAt: {
          type: 'string' as const,
          description: 'Start date for accessibility (ISO format or empty string)',
        },
        accessibleEndAt: {
          type: 'string' as const,
          description: 'End date for accessibility (ISO format or empty string)',
        },
        revokeFlag: { type: 'number' as const, description: 'Revoke flag (0 or 1)' },
        complianceAccessKeyEnabled: { type: 'number' as const, description: 'Compliance access key enabled (0 or 1)' },
      },
      required: [] as const,
    },
    schema: CreateCredentialTemplateArgsSchema,
    handler: (args) => createCredentialTemplate(CreateCredentialTemplateArgsSchema.parse(args)),
  },
  {
    name: 'credential_setup_pricing',
    description:
      'Configure pricing for a credential schema. RULE: When the user says "all verifications", "for all", "all" (e.g. "pricing for all verifications with 0 USD"), you MUST pass pricingModel: "each_attempt". Pass pricingModel: "pay_on_success" only when the user explicitly wants successful verifications only. each_attempt = charge per attempt (all attempts); pay_on_success = charge only when verification succeeds.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        schemaId: { type: 'string' as const, description: 'Schema ID (uses last created schema if not provided)' },
        pricingModel: {
          type: 'string' as const,
          enum: ['each_attempt', 'pay_on_success'],
          description:
            'Use "each_attempt" when user says "all verifications", "for all", "all", or 0 USD for all. Use "pay_on_success" only when user wants successful verifications only. Default is pay_on_success.',
        },
        complianceAccessKeyEnabled: {
          type: 'boolean' as const,
          default: false,
          description: 'Enable Compliance Access Key (CAK) requirement',
        },
        paymentFeeSchemaId: {
          type: 'string' as const,
          description: 'Optional payment fee schema ID (omit to use default USD8)',
        },
        priceUsd: {
          type: 'number' as const,
          description: 'Optional USD per verification (default 0). Use for verification fee in USD.',
        },
      },
    },
    schema: SetupPricingArgsSchema,
    handler: (args) => setupPricing(SetupPricingArgsSchema.parse(args)),
  },
  {
    name: 'credential_create_verification_programs',
    description:
      'Create verification programs for a schema and deploy them. Programs define conditions that credentials must meet for verification. One zkQuery per condition (dashboard-aligned). Value types: string, integer, number, boolean (JSON true/false).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        schemaId: { type: 'string' as const, description: 'Schema ID (uses last created schema if not provided)' },
        deploy: {
          type: 'boolean' as const,
          description: 'If true (default), deploy each program after create so it becomes active.',
        },
        pricingModel: {
          type: 'string' as const,
          enum: ['each_attempt', 'pay_on_success'],
          description:
            'Pricing model to query from payment API before creating programs. Default: pay_on_success. Programs will not be created if no pricing config exists for this model.',
        },
        defaultCredentialIssuerDid: {
          type: 'string' as const,
          description:
            'Optional. Credential issuer DID for issuerDids and zkQuery allowedIssuers when it differs from the MCP session issuer (e.g. did:air:id:testnet:…).',
        },
        defaultIssuerPricingId: {
          type: ['string', 'null'] as const,
          description:
            'Optional. Explicit override for issuerDids.pricingId. When omitted, auto-resolved from the payment API.',
        },
        programs: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              programName: {
                type: 'string' as const,
                description: 'Unique program name (e.g., trading_volume_tier_gold)',
              },
              conditions: {
                type: 'array' as const,
                items: {
                  type: 'object' as const,
                  properties: {
                    attribute: { type: 'string' as const, description: 'Schema attribute to verify' },
                    operator: {
                      type: 'string' as const,
                      enum: ['>', '>=', '<', '<=', '=', '!='],
                      description: 'Comparison operator',
                    },
                    value: { description: 'Value to compare against' },
                  },
                  required: ['attribute', 'operator', 'value'],
                },
                description: 'Verification conditions (all must be true)',
              },
            },
            required: ['programName', 'conditions'],
          },
          description: 'List of verification programs to create',
        },
      },
      required: ['programs'] as const,
    },
    schema: CreateProgramsArgsSchema,
    handler: (args) => createVerificationPrograms(CreateProgramsArgsSchema.parse(args)),
  },
  {
    name: 'credential_list_templates',
    description:
      'List credential templates (issuance programs) for the authenticated issuer. Returns template IDs and names for use as credentialId in SDK.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        page: { type: 'number' as const, description: 'Page number (1-based)', default: 1 },
        size: { type: 'number' as const, description: 'Page size', default: 20 },
        searchStr: { type: 'string' as const, description: 'Optional search string' },
        sortField: { type: 'string' as const, description: 'Sort field', default: 'create_at' },
        order: { type: 'string' as const, enum: ['asc', 'desc'], description: 'Sort order', default: 'desc' },
      },
    },
    schema: ListCredentialTemplatesArgsSchema,
    handler: (args) => listCredentialTemplates(ListCredentialTemplatesArgsSchema.parse(args)),
  },
  {
    name: 'credential_list_programs',
    description:
      'List verification programs for the authenticated verifier. Returns program IDs and names for use as programId in verifyCredential.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        page: { type: 'number' as const, description: 'Page number (1-based)', default: 1 },
        size: { type: 'number' as const, description: 'Page size', default: 20 },
        searchStr: { type: 'string' as const, description: 'Optional search string' },
        sortField: { type: 'string' as const, description: 'Sort field', default: 'uvpi.create_at' },
        order: { type: 'string' as const, enum: ['asc', 'desc'], description: 'Sort order', default: 'desc' },
      },
    },
    schema: ListVerificationProgramsArgsSchema,
    handler: (args) => listVerificationPrograms(ListVerificationProgramsArgsSchema.parse(args)),
  },
  {
    name: 'credential_docs',
    description:
      'Get step-by-step docs for issuance and/or verification flow, aligned with AIR Kit Quickstart 2 (Issue Credentials) and Quickstart 3 (Verify Credentials). Includes production standards (JWT on backend, env for secrets). Use when the developer asks how to set up credentials or verify.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        flow: {
          type: 'string' as const,
          enum: ['issuance', 'verification', 'both'],
          default: 'both',
          description: 'Which flow to document',
        },
      },
    },
    schema: CredentialDocsArgsSchema,
    handler: (args) => credentialDocs(CredentialDocsArgsSchema.parse(args)),
  },
  {
    name: 'credential_list_schemas',
    description:
      'List credential schemas for the authenticated issuer. Use own_schemas for your schemas or other_schemas to search others.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        page: { type: 'number' as const, description: 'Page number (1-based)', default: 1 },
        size: { type: 'number' as const, description: 'Page size', default: 20 },
        searchStr: { type: 'string' as const, description: 'Optional search string' },
        filterType: {
          type: 'string' as const,
          enum: ['own_schemas', 'other_schemas'],
          description: 'own_schemas or other_schemas',
          default: 'own_schemas',
        },
        sortField: { type: 'string' as const, description: 'Sort field', default: 'create_at' },
        order: { type: 'string' as const, enum: ['asc', 'desc'], description: 'Sort order', default: 'desc' },
      },
    },
    schema: ListSchemasArgsSchema,
    handler: (args) => listSchemas(ListSchemasArgsSchema.parse(args)),
  },
  {
    name: 'credential_template_info',
    description:
      'Get repo URL, branch, and clone command for the issuance or verifier template. No auth. For issuance: default branch mcp-template; use with credential_app_steps (appType: issuance) and credential_issuance_app_config for the full issuance flow.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        appType: {
          type: 'string' as const,
          enum: ['issuance', 'verifier'],
          description: 'issuance or verifier template',
        },
        branch: { type: 'string' as const, description: 'Optional branch (e.g. mcp-template, sample/passport-age)' },
      },
      required: ['appType'] as const,
    },
    schema: TemplateInfoArgsSchema,
    handler: (args) => getTemplateInfo(TemplateInfoArgsSchema.parse(args)),
  },
  {
    name: 'credential_issuance_app_config',
    description:
      'Generate .env snippet for the issuance template from session. Requires auth. Includes NEXT_PUBLIC_JWKS_KID (partner ID), NEXT_PUBLIC_CREDENTIALS_CONFIG (schema dataPoints), default NEXT_PUBLIC_REOWN_PROJECT_ID. Instructions for strict replace of PARTNER_PRIVATE_KEY, NEXT_PUBLIC_PARTNER_PUBLIC_KEY, NEXT_PUBLIC_REOWN_PROJECT_ID and for generate vs auto (pnpm run generate-keys + default Reown ID). Use with credential_app_steps and credential_configure_issuer_jwks (after npx instatunnel 3000 for local e2e).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        credentialTemplateId: {
          type: 'string' as const,
          description: 'Optional issuance program ID; if omitted uses first template or session',
        },
      },
    },
    schema: IssuanceAppConfigArgsSchema,
    handler: (args) => getIssuanceAppConfig(IssuanceAppConfigArgsSchema.parse(args)),
  },
  {
    name: 'credential_verifier_app_config',
    description: 'Generate .env snippet for the verifier template from session. Requires auth.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        programId: {
          type: 'string' as const,
          description: 'Optional verification program ID; if omitted uses first program or session',
        },
      },
    },
    schema: VerifierAppConfigArgsSchema,
    handler: (args) => getVerifierAppConfig(VerifierAppConfigArgsSchema.parse(args)),
  },
  {
    name: 'credential_app_steps',
    description:
      'Get ordered develop-to-deploy steps for issuance or verifier. For issuance: clone → install → credential_issuance_app_config + pnpm run generate-keys (strict replace env) → dev → npx instatunnel 3000 → credential_configure_issuer_jwks → build → deploy → JWKS. Use with credential_template_info and credential_issuance_app_config.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        appType: { type: 'string' as const, enum: ['issuance', 'verifier'], description: 'issuance or verifier' },
        branch: { type: 'string' as const, description: 'Optional branch (e.g. mcp-template, sample/passport-age)' },
      },
      required: ['appType'] as const,
    },
    schema: AppStepsArgsSchema,
    handler: (args) => getAppSteps(AppStepsArgsSchema.parse(args)),
  },
  {
    name: 'credential_configure_issuer_jwks',
    description:
      'Set JWKS URL and whitelist domain in the credential dashboard from a single origin. Use the tunnel URL from the console (npx instatunnel 3000); do not use localhost for JWKS. Optionally probe the JWKS endpoint first (use after tunnel is up). Requires auth.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        origin: {
          type: 'string' as const,
          description:
            'Base URL from tunnel: run npx instatunnel 3000, copy the HTTPS URL from the console. Do not use localhost for JWKS. No trailing slash.',
        },
        probeBeforeUpdate: {
          type: 'boolean' as const,
          description:
            'If true, GET the JWKS URL before updating; if not reachable, return error so user can start server and retry. Default true.',
        },
        replaceDomains: {
          type: 'boolean' as const,
          description:
            'If true, set allowed domains to only the new hostname; if false, merge into existing (max 3). Default false.',
        },
      },
      required: ['origin'] as const,
    },
    schema: ConfigureIssuerJwksArgsSchema,
    handler: (args) => configureIssuerJwks(ConfigureIssuerJwksArgsSchema.parse(args)),
  },
  {
    name: 'credential_set_price',
    description:
      'Set verification price on-chain (create new fee schema or update existing). Requires MCP env: CREDENTIAL_MCP_PRIVATE_KEY or CREDENTIAL_MCP_SEED_PHRASE, MOCA_RPC_URL, MOCA_CHAIN_ID, MOCA_PAYMENTS_CONTRACT.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        paymentFeeSchemaId: {
          type: 'string' as const,
          description: 'Existing payment fee schema ID (bytes32 hex). Omit to create a new one.',
        },
        priceUsd: { type: 'number' as const, description: 'Price in USD (e.g. 0.1 for $0.10)' },
      },
      required: ['priceUsd'] as const,
    },
    schema: SetPriceArgsSchema,
    handler: (args) => setPrice(SetPriceArgsSchema.parse(args)),
  },
  {
    name: 'credential_payment_deposit',
    description: 'Verifier top-up: deposit USD8 to verifier balance on-chain. Requires chain wallet env.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        verifierAddress: { type: 'string' as const, description: 'Verifier address (asset manager) to top up' },
        amountUsd: { type: 'number' as const, description: 'Amount in USD (USD8)' },
      },
      required: ['verifierAddress', 'amountUsd'] as const,
    },
    schema: PaymentDepositArgsSchema,
    handler: (args) => paymentDeposit(PaymentDepositArgsSchema.parse(args)),
  },
  {
    name: 'credential_payment_withdraw',
    description: 'Verifier withdraw: withdraw USD8 from verifier balance on-chain. Requires chain wallet env.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        verifierAddress: { type: 'string' as const, description: 'Verifier address (asset manager) to withdraw from' },
        amountUsd: { type: 'number' as const, description: 'Amount in USD (USD8) to withdraw' },
      },
      required: ['verifierAddress', 'amountUsd'] as const,
    },
    schema: PaymentWithdrawArgsSchema,
    handler: (args) => paymentWithdraw(PaymentWithdrawArgsSchema.parse(args)),
  },
  {
    name: 'credential_payment_claim_fees',
    description: 'Issuer claim fees on-chain. Requires chain wallet env.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        issuerAddress: { type: 'string' as const, description: 'Issuer address (asset manager) to claim fees for' },
      },
      required: ['issuerAddress'] as const,
    },
    schema: PaymentClaimFeesArgsSchema,
    handler: (args) => paymentClaimFees(PaymentClaimFeesArgsSchema.parse(args)),
  },
  {
    name: 'credential_stake_moca',
    description:
      'Stake native MOCA for issuer usage quota (tiers). Requires chain wallet env. Respects MAX_SINGLE_STAKE_AMOUNT.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        amountMoca: { type: 'string' as const, description: 'Amount of MOCA to stake (e.g. "10" for 10 MOCA)' },
      },
      required: ['amountMoca'] as const,
    },
    schema: StakeMocaArgsSchema,
    handler: (args) => stakeMoca(StakeMocaArgsSchema.parse(args)),
  },
  {
    name: 'credential_unstake_moca',
    description:
      'Initiate unstake of MOCA. After UNSTAKE_DELAY, use credential_claim_unstake_moca with the claimable timestamp(s). Requires chain wallet env.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        amountMoca: { type: 'string' as const, description: 'Amount of MOCA to initiate unstake for' },
      },
      required: ['amountMoca'] as const,
    },
    schema: UnstakeMocaArgsSchema,
    handler: (args) => unstakeMoca(UnstakeMocaArgsSchema.parse(args)),
  },
  {
    name: 'credential_claim_unstake_moca',
    description:
      'Claim MOCA after unstake delay. Pass array of claimable timestamps from prior initiateUnstake. Requires chain wallet env.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        timestamps: {
          type: 'array' as const,
          items: { type: 'number' as const },
          description: 'Array of claimable timestamps (from UnstakeInitiated event)',
        },
      },
      required: ['timestamps'] as const,
    },
    schema: ClaimUnstakeMocaArgsSchema,
    handler: (args) => claimUnstakeMoca(ClaimUnstakeMocaArgsSchema.parse(args)),
  },
  {
    name: 'x402_pay_and_verify',
    description:
      'Call any x402-protected API endpoint with automatic on-chain payment. Uses EIP-3009 transferWithAuthorization via @x402/fetch. Requires CREDENTIAL_MCP_PRIVATE_KEY for signing.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string' as const, description: 'Full URL of the x402-protected endpoint to call' },
        method: { type: 'string' as const, enum: ['GET', 'POST'], description: 'HTTP method (default GET)' },
        body: { type: 'object' as const, description: 'Optional JSON body for POST requests' },
      },
      required: ['url'] as const,
    },
    schema: X402PayAndVerifyArgsSchema,
    handler: (args) => x402PayAndVerify(X402PayAndVerifyArgsSchema.parse(args)),
  },
];

const BY_NAME = new Map<string, ToolRegistryEntry>(TOOL_ENTRIES.map((e) => [e.name, e]));

/** Tools list for MCP tools/list (same shape as before). */
export function getToolsList(): ToolListEntry[] {
  return TOOL_ENTRIES.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
}

/** Get registry entry by tool name for tools/call dispatch. */
export function getToolEntry(name: string): ToolRegistryEntry | undefined {
  return BY_NAME.get(name);
}
