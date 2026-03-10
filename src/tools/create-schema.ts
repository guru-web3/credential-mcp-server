import { z } from 'zod';
import { session } from '../session.js';
import { apiRequest } from '../utils/api.js';
import { getCredentialApiUrl, getEnvironment } from '../config.js';
import { SchemaDataPoint } from '../types.js';
import { alphanumericRegEx, numberOnlyReg, versionRegEx } from '../constants/regex.js';

/** Generate a 21-char id for attribute (matches dashboard scripts) */
function generateAttributeId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  for (let i = 0; i < 21; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/** Min length for schema name/title (non-empty) */
const MIN_STRING_LENGTH = 1;

export const CreateSchemaArgsSchema = z
  .object({
    schemaName: z
      .string()
      .min(MIN_STRING_LENGTH, 'Schema name (title) is required')
      .describe('Schema name (e.g., trading-volume-credential)'),
    schemaType: z
      .string()
      .min(MIN_STRING_LENGTH, 'Schema type is required')
      .describe('Schema type identifier (e.g., tradingVolumeCredential). Must be unique. Alphanumeric only, not numbers only.'),
    dataPoints: z
      .array(
        z.object({
          name: z.string().min(1, 'Attribute name is required'),
          type: z.enum(['string', 'integer', 'number', 'boolean']).describe('Data type'),
          description: z.string().optional().describe('Attribute description (optional)'),
        })
      )
      .min(1, 'At least one data point is required')
      .describe('List of data points/attributes for the credential'),
    description: z.string().optional().describe('Schema description'),
    version: z.string().default('1.0').describe('Schema version (e.g. 1.0, 1.0.1)'),
  })
  .refine(
    (data) => alphanumericRegEx.test(data.schemaType),
    { message: 'Schema type must contain only alphanumeric characters with no spaces.', path: ['schemaType'] }
  )
  .refine(
    (data) => !numberOnlyReg.test(data.schemaType),
    { message: 'Schema type cannot consist of numbers only.', path: ['schemaType'] }
  )
  .refine(
    (data) => versionRegEx.test(data.version ?? '1.0'),
    { message: 'Version must follow standard format (e.g. 1.0, 1.0.1).', path: ['version'] }
  );

export async function createSchema(args: z.infer<typeof CreateSchemaArgsSchema>) {
  await session.requireAuth();

  const issuerId = session.get('issuerId');
  if (!issuerId) {
    throw new Error('No issuer ID in session. Re-connect to the MCP server to authenticate.');
  }

  const { schemaName, schemaType, dataPoints, description, version } = args;

  // Build credential subject schema (JSON Schema format) – matches dashboard scripts
  const properties: Record<string, any> = {};
  dataPoints.forEach((dp: SchemaDataPoint) => {
    properties[dp.name] = {
      type: dp.type,
      title: dp.description || dp.name,
      ...(dp.description && { description: dp.description }),
    };
  });

  const credentialSubject = {
    type: 'object',
    title: 'Credential subject',
    properties: {
      ...properties,
      id: {
        format: 'uri',
        description: 'Define the DID of the subject that owns the credential',
        type: 'string',
        title: 'Credential subject ID'
      }
    },
    required: ['id']
  };

  // attribute.data is required by the API (see credential-dashboard/scripts/create-schema.js)
  const attributeData = dataPoints.map((dp: SchemaDataPoint) => ({
    name: dp.name,
    title: dp.description || dp.name,
    id: generateAttributeId(),
    depth: 1,
    description: dp.description || '',
    isRequired: false,
    type: dp.type,
    data_value_format: null,
    data_value_enum: null,
    data_value_max: null,
    data_value_min: null,
    data_value_pattern: null,
    data_value_default: null,
  }));

  const schemaData = {
    credentialSubject,
    title: schemaName,
    description: description || `Credential schema for ${schemaName}`,
    schemeType: schemaType,
    version,
    attribute: { data: attributeData },
  };

  console.log('[DEBUG] Schema payload:', JSON.stringify(schemaData, null, 2));

  try {
    const response = await apiRequest<{
      schemeId: string;
      schemeDstorageId: string;
      schemeVersion: string;
      schemeStatus: string;
    }>('POST', '/management/scheme/publishOnOss', schemaData, { 'x-issuer-id': issuerId });

    const schemaId = response.data.schemeId;
    
    // Store in session for subsequent operations
    session.set('schemaId', schemaId);
    session.set('schemaName', schemaName);
    session.set('schemaType', schemaType);
    session.set('schemaContext', `${getCredentialApiUrl()}/dstorage/download/${response.data.schemeDstorageId}`);

    return {
      success: true,
      message: 'Schema created and published successfully',
      schemaId,
      storageId: response.data.schemeDstorageId,
      version: response.data.schemeVersion,
      status: response.data.schemeStatus,
      dataPoints,
      nextSteps: [
        'Configure pricing with credential_setup_pricing',
        'Create issuance program with credential_create_program, then verification programs with credential_create_verification_programs',
      ],
    };
  } catch (error: any) {
    const env = getEnvironment();
    const baseMsg = `Schema creation failed: ${error.message}`;
    console.log('[DEBUG] Error:', error);
    if (env === 'sandbox') {
      throw new Error(
        `${baseMsg} Sandbox is not currently supported for schema creation (backend not yet deployed). Use CREDENTIAL_MCP_ENVIRONMENT=staging or production.`
      );
    }
    throw new Error(baseMsg);
  }
}
