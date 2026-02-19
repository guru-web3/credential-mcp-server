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
import { publishSchema, PublishSchemaArgsSchema } from './tools/publish-schema.js';
import { verifySchemaPublished, VerifySchemaPublishedArgsSchema } from './tools/verify-schema-published.js';

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
      name: 'credential_publish_schema',
      description: 'Publish a schema to OSS storage. This is REQUIRED before creating verification programs, as the backend validates zkQuery by downloading the schema from OSS.',
      inputSchema: {
        type: 'object',
        properties: {
          schemaId: {
            type: 'string',
            description: 'The schema ID to publish (optional, uses current session schemaId if not provided)',
          },
        },
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
      name: 'credential_create_template',
      description: 'Create a credential template for the issuer. This is required before creating verification programs.',
      inputSchema: {
        type: 'object',
        properties: {
          credentialName: {
            type: 'string',
            description: 'Name of the credential',
          },
          schemeType: {
            type: 'string',
            description: 'Schema type identifier (e.g., "nftHolderCredential")',
          },
          schemeTitle: {
            type: 'string',
            description: 'Schema title',
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
        required: ['credentialName', 'schemeType', 'schemeTitle'],
      },
    },
    {
      name: 'credential_setup_pricing',
      description: 'Configure pricing model for a credential schema. Supports per-issuance or subscription models.',
      inputSchema: {
        type: 'object',
        properties: {
          schemaId: {
            type: 'string',
            description: 'Schema ID (uses last created schema if not provided)',
          },
          pricingModel: {
            type: 'string',
            enum: ['per-issuance', 'subscription'],
            description: 'Pricing model: per-issuance charges each time, subscription is periodic',
          },
          priceUsd: {
            type: 'number',
            description: 'Price in USD (e.g., 0.50 for $0.50, 10 for $10)',
          },
          cakEnabled: {
            type: 'boolean',
            default: false,
            description: 'Enable Compliance Access Key (CAK) requirement',
          },
          subscriptionDays: {
            type: 'number',
            description: 'Subscription duration in days (required for subscription model)',
          },
        },
        required: ['pricingModel', 'priceUsd'],
      },
    },
    {
      name: 'credential_create_verification_programs',
      description: 'Create verification programs for a schema. Programs define conditions that credentials must meet for verification.',
      inputSchema: {
        type: 'object',
        properties: {
          schemaId: {
            type: 'string',
            description: 'Schema ID (uses last created schema if not provided)',
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

      case 'credential_publish_schema': {
        const validated = PublishSchemaArgsSchema.parse(args);
        result = await publishSchema(validated);
        break;
      }

      case 'credential_verify_schema_published': {
        const validated = VerifySchemaPublishedArgsSchema.parse(args);
        result = await verifySchemaPublished(validated);
        break;
      }

      case 'credential_create_template': {
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
