#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { authenticate, AuthenticateArgsSchema } from './tools/authenticate.js';
import { createSchema, CreateSchemaArgsSchema } from './tools/create-schema.js';
import { createCredentialTemplate, CreateCredentialTemplateArgsSchema } from './tools/create-credential-template.js';
import { setupPricing, SetupPricingArgsSchema } from './tools/setup-pricing.js';
import { createVerificationPrograms, CreateProgramsArgsSchema } from './tools/create-programs.js';
import { verifySchemaPublished, VerifySchemaPublishedArgsSchema } from './tools/verify-schema-published.js';
import { listCredentialTemplates, ListCredentialTemplatesArgsSchema } from './tools/list-credential-templates.js';
import { listVerificationPrograms, ListVerificationProgramsArgsSchema } from './tools/list-verification-programs.js';
import { credentialDocs, CredentialDocsArgsSchema } from './tools/credential-docs.js';
import { listSchemas, ListSchemasArgsSchema } from './tools/list-schemas.js';

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

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'credential_authenticate',
      description: 'Authenticate with your private key to access credential management APIs. Required before using other tools.',
      inputSchema: {
        type: 'object',
        properties: {
          privateKey: {
            type: 'string',
            description: 'Ethereum wallet private key (64 hex characters, with or without 0x prefix)',
          },
          partnerId: {
            type: 'string',
            description: 'Partner ID (optional, will be retrieved from API)',
          },
          environment: {
            type: 'string',
            enum: ['development', 'staging', 'production'],
            default: 'staging',
            description: 'Target environment',
          },
        },
        required: ['privateKey'],
      },
    },
    {
      name: 'credential_create_schema',
      description: 'Create and publish a new credential schema with specified data points. Returns schema ID for use in pricing and program creation.',
      inputSchema: {
        type: 'object',
        properties: {
          schemaName: {
            type: 'string',
            description: 'Schema name (e.g., trading-volume-credential)',
          },
          schemaType: {
            type: 'string',
            description: 'Schema type identifier (e.g., tradingVolumeCredential). Must be unique.',
          },
          dataPoints: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Attribute name' },
                type: {
                  type: 'string',
                  enum: ['string', 'integer', 'number', 'boolean'],
                  description: 'Data type',
                },
                description: { type: 'string', description: 'Attribute description (optional)' },
              },
              required: ['name', 'type'],
            },
            description: 'List of data points/attributes',
          },
          description: {
            type: 'string',
            description: 'Schema description (optional)',
          },
          version: {
            type: 'string',
            default: '1.0',
            description: 'Schema version',
          },
        },
        required: ['schemaName', 'schemaType', 'dataPoints'],
      },
    },
    {
      name: 'credential_verify_schema_published',
      description: 'Verify that a schema is published to OSS and accessible. Use this before creating programs to ensure the schema is ready.',
      inputSchema: {
        type: 'object',
        properties: {
          schemaId: {
            type: 'string',
            description: 'The schema ID to verify (optional, uses current session schemaId if not provided)',
          },
        },
      },
    },
    {
      name: 'credential_create_program',
      description: 'Create an issuance program (credential template). Pass schemaId to fill schemeType, schemeTitle and credentialName from the schema; otherwise provide them or use session schemaId.',
      inputSchema: {
        type: 'object',
        properties: {
          schemaId: {
            type: 'string',
            description: 'Schema ID. When provided, schemeType, schemeTitle and credentialName are fetched from the schema if omitted.',
          },
          credentialName: {
            type: 'string',
            description: 'Name of the credential. Defaults to schema title when schemaId is provided.',
          },
          schemeType: {
            type: 'string',
            description: 'Schema type identifier. Filled from schema when schemaId is provided.',
          },
          schemeTitle: {
            type: 'string',
            description: 'Schema title. Filled from schema when schemaId is provided.',
          },
          expirationDuration: {
            type: 'number',
            description: 'Expiration duration in days (default: 365)',
          },
          issueMax: {
            type: ['number', 'null'],
            description: 'Maximum number of credentials to issue (null for unlimited)',
          },
          accessibleStartAt: {
            type: 'string',
            description: 'Start date for accessibility (ISO format or empty string)',
          },
          accessibleEndAt: {
            type: 'string',
            description: 'End date for accessibility (ISO format or empty string)',
          },
          revokeFlag: {
            type: 'number',
            description: 'Revoke flag (0 or 1)',
          },
          complianceAccessKeyEnabled: {
            type: 'number',
            description: 'Compliance access key enabled (0 or 1)',
          },
        },
        required: [],
      },
    },
    {
      name: 'credential_setup_pricing',
      description: 'Configure pricing model for a credential schema on MOCA payment API. Use pay_on_success (charge for verifications) or pay_on_issuance.',
      inputSchema: {
        type: 'object',
        properties: {
          schemaId: {
            type: 'string',
            description: 'Schema ID (uses last created schema if not provided)',
          },
          pricingModel: {
            type: 'string',
            enum: ['pay_on_success', 'pay_on_issuance'],
            description: 'pay_on_success = charge only for successful verifications; pay_on_issuance = charge on issuance',
          },
          complianceAccessKeyEnabled: {
            type: 'boolean',
            default: false,
            description: 'Enable Compliance Access Key (CAK) requirement',
          },
          paymentFeeSchemaId: {
            type: 'string',
            description: 'Optional payment fee schema ID (omit to use default USD8)',
          },
          priceUsd: {
            type: 'number',
            description: 'Optional USD per verification (default 0). Use for verification fee in USD.',
          },
        },
      },
    },
    {
      name: 'credential_create_verification_programs',
      description: 'Create verification programs for a schema and deploy them. Programs define conditions that credentials must meet for verification.',
      inputSchema: {
        type: 'object',
        properties: {
          schemaId: {
            type: 'string',
            description: 'Schema ID (uses last created schema if not provided)',
          },
          deploy: {
            type: 'boolean',
            description: 'If true (default), deploy each program after create so it becomes active.',
          },
          programs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                programName: {
                  type: 'string',
                  description: 'Unique program name (e.g., trading_volume_tier_gold)',
                },
                conditions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      attribute: { type: 'string', description: 'Schema attribute to verify' },
                      operator: {
                        type: 'string',
                        enum: ['>', '>=', '<', '<=', '=', '!='],
                        description: 'Comparison operator',
                      },
                      value: {
                        description: 'Value to compare against',
                      },
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
        required: ['programs'],
      },
    },
    {
      name: 'credential_list_templates',
      description: 'List credential templates (issuance programs) for the authenticated issuer. Returns template IDs and names for use as credentialId in SDK.',
      inputSchema: {
        type: 'object',
        properties: {
          page: { type: 'number', description: 'Page number (1-based)', default: 1 },
          size: { type: 'number', description: 'Page size', default: 20 },
          searchStr: { type: 'string', description: 'Optional search string' },
          sortField: { type: 'string', description: 'Sort field', default: 'create_at' },
          order: { type: 'string', enum: ['asc', 'desc'], description: 'Sort order', default: 'desc' },
        },
      },
    },
    {
      name: 'credential_list_programs',
      description: 'List verification programs for the authenticated verifier. Returns program IDs and names for use as programId in verifyCredential.',
      inputSchema: {
        type: 'object',
        properties: {
          page: { type: 'number', description: 'Page number (1-based)', default: 1 },
          size: { type: 'number', description: 'Page size', default: 20 },
          searchStr: { type: 'string', description: 'Optional search string' },
          sortField: { type: 'string', description: 'Sort field', default: 'uvpi.create_at' },
          order: { type: 'string', enum: ['asc', 'desc'], description: 'Sort order', default: 'desc' },
        },
      },
    },
    {
      name: 'credential_docs',
      description: 'Get step-by-step docs for issuance and/or verification flow. Use when the developer asks how to set up credentials or verify.',
      inputSchema: {
        type: 'object',
        properties: {
          flow: {
            type: 'string',
            enum: ['issuance', 'verification', 'both'],
            default: 'both',
            description: 'Which flow to document',
          },
        },
      },
    },
    {
      name: 'credential_list_schemas',
      description: 'List credential schemas for the authenticated issuer. Use own_schemas for your schemas or other_schemas to search others.',
      inputSchema: {
        type: 'object',
        properties: {
          page: { type: 'number', description: 'Page number (1-based)', default: 1 },
          size: { type: 'number', description: 'Page size', default: 20 },
          searchStr: { type: 'string', description: 'Optional search string' },
          filterType: { type: 'string', enum: ['own_schemas', 'other_schemas'], description: 'own_schemas or other_schemas', default: 'own_schemas' },
          sortField: { type: 'string', description: 'Sort field', default: 'create_at' },
          order: { type: 'string', enum: ['asc', 'desc'], description: 'Sort order', default: 'desc' },
        },
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: any;

    switch (name) {
      case 'credential_authenticate': {
        const validated = AuthenticateArgsSchema.parse(args);
        result = await authenticate(validated);
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

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: error.message,
              tool: name,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);

console.error('Animoca Credential MCP Server started');
