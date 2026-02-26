/**
 * Create Credential Template (issuance program)
 * Creates a credential template for an issuer. Accepts schemaId and fills schemeType/schemeTitle/credentialName from the schema when provided.
 */

import { z } from 'zod';
import { session } from '../session.js';
import { apiRequest } from '../utils/api.js';

export const CreateCredentialTemplateArgsSchema = z.object({
  schemaId: z.string().optional().describe('Schema ID to use. When provided, schemeType, schemeTitle and credentialName are fetched from the schema if not given.'),
  credentialName: z.string().optional().describe('Name of the credential. Filled from schema title when schemaId is provided and this is omitted.'),
  schemeType: z.string().optional().describe('Schema type identifier. Filled from schema when schemaId is provided and this is omitted.'),
  schemeTitle: z.string().optional().describe('Schema title. Filled from schema when schemaId is provided and this is omitted.'),
  expirationDuration: z.coerce.number().min(1).default(365).describe('Expiration duration in days (min 1)'),
  issueMax: z.union([z.coerce.number(), z.null()]).optional().default(null).describe('Maximum number of credentials to issue (null for unlimited)'),
  accessibleStartAt: z.string().default('').describe('Start date for accessibility (ISO format or empty)'),
  accessibleEndAt: z.string().default('').describe('End date for accessibility (ISO format or empty)'),
  revokeFlag: z.coerce.number().default(0).describe('Revoke flag (0 or 1)'),
  complianceAccessKeyEnabled: z.coerce.number().default(0).describe('Compliance access key enabled (0 or 1)'),
}).refine(
  (data) => {
    if (!data.accessibleStartAt || !data.accessibleEndAt) return true;
    return new Date(data.accessibleEndAt) > new Date(data.accessibleStartAt);
  },
  { message: 'accessibleEndAt must be after accessibleStartAt when both are set', path: ['accessibleEndAt'] }
).transform((data) => {
  // Ensure issueMax is never 0 or negative; default to null if it is
  if (data.issueMax !== null && typeof data.issueMax === 'number' && data.issueMax <= 0) {
    data.issueMax = null;
  }
  return data;
});

interface SchemeByIdResponse {
  schemeId: string;
  schemeTitle: string;
  schemeType: string;
  [key: string]: unknown;
}

export async function createCredentialTemplate(
  args: z.infer<typeof CreateCredentialTemplateArgsSchema>
) {
  const validated = CreateCredentialTemplateArgsSchema.parse(args);

  const issuerId = session.get('issuerId');
  const dashboardToken = session.get('dashboardToken');
  if (!issuerId) {
    throw new Error('No issuer ID found in session. Re-connect to the MCP server to authenticate.');
  }
  if (!dashboardToken) {
    throw new Error('No dashboard token found in session. Re-connect to the MCP server to authenticate.');
  }

  // Resolve schemaId: input takes precedence, then session
  let schemaId = validated.schemaId ?? session.get('schemaId');
  let schemeType = validated.schemeType;
  let schemeTitle = validated.schemeTitle;
  let credentialName = validated.credentialName;

  // When we have a schemaId, fetch schema to fill missing fields
  if (schemaId) {
    const schemeRes = await apiRequest<SchemeByIdResponse>(
      'POST',
      '/management/scheme/queryById',
      { schemeId: schemaId },
      { 'x-issuer-id': issuerId }
    );
    const schemaData = schemeRes.data;
    schemeType = schemeType ?? schemaData.schemeType;
    schemeTitle = schemeTitle ?? schemaData.schemeTitle;
    credentialName = credentialName ?? schemaData.schemeTitle;
  }

  if (!schemaId) {
    throw new Error('No schema ID. Provide schemaId or create a schema first (session will have schemaId).');
  }
  if (!schemeType || !schemeTitle) {
    throw new Error('Missing schemeType or schemeTitle. Provide them or pass schemaId so they can be loaded from the schema.');
  }
  if (!credentialName) {
    throw new Error('Missing credentialName. Provide it or pass schemaId so it can be defaulted from the schema title.');
  }

  console.log('[DEBUG] Creating issuance program (credential template)...');

  const templateData = {
    credentialName,
    expirationDuration: validated.expirationDuration,
    issueMax: validated.issueMax,
    issuerId,
    schemeType,
    schemeTitle,
    schemeId: schemaId,
    accessibleStartAt: validated.accessibleStartAt,
    accessibleEndAt: validated.accessibleEndAt,
    revokeFlag: validated.revokeFlag,
    complianceAccessKeyEnabled: validated.complianceAccessKeyEnabled,
  };

  console.log('[DEBUG] Template data:', JSON.stringify(templateData, null, 2));

  try {
    const response = await apiRequest<{
      credentialId: string;
      id: number;
      status: string;
    }>(
      'POST',
      '/issuer/credentialTemplateCreate',
      templateData,
      {
        'x-issuer-id': issuerId,
      }
    );

    console.log('[DEBUG] Credential template created:', response.data);

    session.set('credentialTemplateId', response.data.credentialId);

    return {
      success: true,
      message: 'Issuance program created successfully',
      programId: response.data.credentialId,
      credentialName,
      schemaId,
      status: response.data.status,
    };
  } catch (error: any) {
    console.error('[DEBUG] Failed to create issuance program:', error.message);
    throw new Error(`Program creation failed: ${error.message}`);
  }
}

export const createCredentialTemplateToolDefinition = {
  name: 'credential_create_program',
  description: 'Create an issuance program (credential template) for the issuer. Pass schemaId to fill schemeType, schemeTitle and credentialName from the schema; otherwise provide them or use session schemaId.',
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
};
