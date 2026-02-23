export const TOOLS_LIST = [
  {
    name: 'credential_authenticate',
    description:
      'Authenticate after you have credentials. Use (1) privateKey (or CREDENTIAL_MCP_PRIVATE_KEY) for direct auth, or (2) the signed result from the signer page: pass credentialsJson (full JSON from signer) or walletAddress + signature + timestamp. If the user gives ONLY a wallet address and no private key, do NOT call this yet—call credential_get_login_challenge first to get the signer URL, then credential_authenticate with the signed JSON.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        credentialsJson: { type: 'string' as const, description: 'Full JSON from the signer page (environment, walletAddress, signature, timestamp). Paste the copied JSON here to authenticate in one step. Overrides individual fields if both are provided.' },
        privateKey: { type: 'string' as const, description: 'Ethereum wallet private key (omit when using message-signing; can use CREDENTIAL_MCP_PRIVATE_KEY env instead)' },
        environment: { type: 'string' as const, enum: ['development', 'staging', 'production'], default: 'staging', description: 'Target environment' },
        walletAddress: { type: 'string' as const, description: 'For message-signing: wallet address from signer page output (only use together with signature and timestamp from signer)' },
        signature: { type: 'string' as const, description: 'For message-signing: signature from signer page output' },
        timestamp: { description: 'For message-signing: timestamp in ms from signer page (number or string)', oneOf: [{ type: 'number' as const }, { type: 'string' as const }] },
      },
    },
  },
  {
    name: 'credential_get_login_challenge',
    description:
      'Recommended first step when user wants to authenticate with a wallet address (no private key). Call this with the user\'s wallet address to get a one-time signerUrl and login message. User opens signerUrl in a browser, signs with their wallet, then copies the JSON and you call credential_authenticate with that JSON (or credentialsJson). Use this whenever the user provides only a wallet address for auth.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        walletAddress: { type: 'string' as const, description: 'Ethereum wallet address (0x...) that will sign the message' },
        environment: { type: 'string' as const, enum: ['staging', 'production'], default: 'staging', description: 'API environment' },
      },
      required: ['walletAddress'] as const,
    },
  },
  {
    name: 'credential_create_schema',
    description: 'Create and publish a new credential schema with specified data points. Returns schema ID for use in pricing and program creation.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        schemaName: { type: 'string' as const, description: 'Schema name (e.g., trading-volume-credential)' },
        schemaType: { type: 'string' as const, description: 'Schema type identifier (e.g., tradingVolumeCredential). Must be unique.' },
        dataPoints: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              name: { type: 'string' as const, description: 'Attribute name' },
              type: { type: 'string' as const, enum: ['string', 'integer', 'number', 'boolean'], description: 'Data type' },
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
  },
  {
    name: 'credential_verify_schema_published',
    description: 'Verify that a schema is published to OSS and accessible. Use this before creating programs to ensure the schema is ready.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        schemaId: { type: 'string' as const, description: 'The schema ID to verify (optional, uses current session schemaId if not provided)' },
      },
    },
  },
  {
    name: 'credential_create_program',
    description: 'Create an issuance program (credential template). Pass schemaId to fill schemeType, schemeTitle and credentialName from the schema; otherwise provide them or use session schemaId.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        schemaId: { type: 'string' as const, description: 'Schema ID. When provided, schemeType, schemeTitle and credentialName are fetched from the schema if omitted.' },
        credentialName: { type: 'string' as const, description: 'Name of the credential. Defaults to schema title when schemaId is provided.' },
        schemeType: { type: 'string' as const, description: 'Schema type identifier. Filled from schema when schemaId is provided.' },
        schemeTitle: { type: 'string' as const, description: 'Schema title. Filled from schema when schemaId is provided.' },
        expirationDuration: { type: 'number' as const, description: 'Expiration duration in days (default: 365)' },
        issueMax: { type: ['number', 'null'] as const, description: 'Maximum number of credentials to issue (null for unlimited)' },
        accessibleStartAt: { type: 'string' as const, description: 'Start date for accessibility (ISO format or empty string)' },
        accessibleEndAt: { type: 'string' as const, description: 'End date for accessibility (ISO format or empty string)' },
        revokeFlag: { type: 'number' as const, description: 'Revoke flag (0 or 1)' },
        complianceAccessKeyEnabled: { type: 'number' as const, description: 'Compliance access key enabled (0 or 1)' },
      },
      required: [] as const,
    },
  },
  {
    name: 'credential_setup_pricing',
    description: 'Configure pricing model for a credential schema on MOCA payment API. Use pay_on_success (charge for verifications) or pay_on_issuance.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        schemaId: { type: 'string' as const, description: 'Schema ID (uses last created schema if not provided)' },
        pricingModel: { type: 'string' as const, enum: ['pay_on_success', 'pay_on_issuance'], description: 'pay_on_success = charge only for successful verifications; pay_on_issuance = charge on issuance' },
        complianceAccessKeyEnabled: { type: 'boolean' as const, default: false, description: 'Enable Compliance Access Key (CAK) requirement' },
        paymentFeeSchemaId: { type: 'string' as const, description: 'Optional payment fee schema ID (omit to use default USD8)' },
        priceUsd: { type: 'number' as const, description: 'Optional USD per verification (default 0). Use for verification fee in USD.' },
      },
    },
  },
  {
    name: 'credential_create_verification_programs',
    description: 'Create verification programs for a schema and deploy them. Programs define conditions that credentials must meet for verification.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        schemaId: { type: 'string' as const, description: 'Schema ID (uses last created schema if not provided)' },
        deploy: { type: 'boolean' as const, description: 'If true (default), deploy each program after create so it becomes active.' },
        programs: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              programName: { type: 'string' as const, description: 'Unique program name (e.g., trading_volume_tier_gold)' },
              conditions: {
                type: 'array' as const,
                items: {
                  type: 'object' as const,
                  properties: {
                    attribute: { type: 'string' as const, description: 'Schema attribute to verify' },
                    operator: { type: 'string' as const, enum: ['>', '>=', '<', '<=', '=', '!='], description: 'Comparison operator' },
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
  },
  {
    name: 'credential_list_templates',
    description: 'List credential templates (issuance programs) for the authenticated issuer. Returns template IDs and names for use as credentialId in SDK.',
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
  },
  {
    name: 'credential_list_programs',
    description: 'List verification programs for the authenticated verifier. Returns program IDs and names for use as programId in verifyCredential.',
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
  },
  {
    name: 'credential_docs',
    description: 'Get step-by-step docs for issuance and/or verification flow. Use when the developer asks how to set up credentials or verify.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        flow: { type: 'string' as const, enum: ['issuance', 'verification', 'both'], default: 'both', description: 'Which flow to document' },
      },
    },
  },
  {
    name: 'credential_list_schemas',
    description: 'List credential schemas for the authenticated issuer. Use own_schemas for your schemas or other_schemas to search others.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        page: { type: 'number' as const, description: 'Page number (1-based)', default: 1 },
        size: { type: 'number' as const, description: 'Page size', default: 20 },
        searchStr: { type: 'string' as const, description: 'Optional search string' },
        filterType: { type: 'string' as const, enum: ['own_schemas', 'other_schemas'], description: 'own_schemas or other_schemas', default: 'own_schemas' },
        sortField: { type: 'string' as const, description: 'Sort field', default: 'create_at' },
        order: { type: 'string' as const, enum: ['asc', 'desc'], description: 'Sort order', default: 'desc' },
      },
    },
  },
  {
    name: 'credential_template_info',
    description: 'Get repo URL, branch, and clone command for the issuance or verifier template. No auth. Use before clone/develop. Default branch for issuance: mcp/template; also available: sample/passport-age.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        appType: { type: 'string' as const, enum: ['issuance', 'verifier'], description: 'issuance or verifier template' },
        branch: { type: 'string' as const, description: 'Optional branch (e.g. mcp/template, sample/passport-age)' },
      },
      required: ['appType'] as const,
    },
  },
  {
    name: 'credential_issuance_app_config',
    description: 'Generate .env snippet for the issuance template from session. Requires auth. Returns instructions for auto-generating PARTNER_PRIVATE_KEY and NEXT_PUBLIC_PARTNER_PUBLIC_KEY (no manual steps). JWKS kid defaults to partner ID; set JWKS URL in dashboard after deploy.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        credentialTemplateId: { type: 'string' as const, description: 'Optional issuance program ID; if omitted uses first template or session' },
      },
    },
  },
  {
    name: 'credential_verifier_app_config',
    description: 'Generate .env snippet for the verifier template from session. Requires auth.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        programId: { type: 'string' as const, description: 'Optional verification program ID; if omitted uses first program or session' },
      },
    },
  },
  {
    name: 'credential_app_steps',
    description: 'Get ordered develop-to-deploy steps: clone (with branch), install, generate keys + env, dev, build, deploy, set JWKS URL in dashboard. Use with credential_template_info and credential_issuance_app_config.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        appType: { type: 'string' as const, enum: ['issuance', 'verifier'], description: 'issuance or verifier' },
        branch: { type: 'string' as const, description: 'Optional branch (e.g. mcp/template, sample/passport-age)' },
      },
      required: ['appType'] as const,
    },
  },
];
