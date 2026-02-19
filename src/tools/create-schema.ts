import { z } from 'zod';
import { session } from '../session.js';
import { apiRequest } from '../utils/api.js';
import { SchemaDataPoint } from '../types.js';

export const CreateSchemaArgsSchema = z.object({
  schemaName: z.string().describe('Schema name (e.g., trading-volume-credential)'),
  schemaType: z.string().describe('Schema type identifier (e.g., tradingVolumeCredential). Must be unique.'),
  dataPoints: z.array(z.object({
    name: z.string().describe('Attribute name (e.g., totalVolume)'),
    type: z.enum(['string', 'integer', 'number', 'boolean']).describe('Data type'),
    description: z.string().optional().describe('Attribute description (optional)'),
  })).describe('List of data points/attributes for the credential'),
  description: z.string().optional().describe('Schema description'),
  version: z.string().default('1.0').describe('Schema version'),
});

export async function createSchema(args: z.infer<typeof CreateSchemaArgsSchema>) {
  session.requireAuth();

  const { schemaName, schemaType, dataPoints, description, version } = args;

  // Build credential subject schema (JSON Schema format)
  const properties: Record<string, any> = {};
  dataPoints.forEach((dp: SchemaDataPoint) => {
    properties[dp.name] = {
      type: dp.type,
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

  const schemaData = {
    credentialSubject,
    title: schemaName,
    description: description || `Credential schema for ${schemaName}`,
    schemeType: schemaType,
    version,
  };

  console.log('[DEBUG] Schema payload:', JSON.stringify(schemaData, null, 2));

  try {
    const response = await apiRequest<{
      schemeId: string;
      schemeDstorageId: string;
      schemeVersion: string;
      schemeStatus: string;
    }>('POST', '/management/scheme/publishOnOss', schemaData);

    const schemaId = response.data.schemeId;
    
    // Store in session for subsequent operations
    session.set('schemaId', schemaId);
    session.set('schemaName', schemaName);
    session.set('schemaType', schemaType);
    session.set('schemaContext', `https://credential.api.staging.air3.com/dstorage/download/${response.data.schemeDstorageId}`);

    return {
      success: true,
      message: 'Schema created and published successfully',
      schemaId,
      storageId: response.data.schemeDstorageId,
      version: response.data.schemeVersion,
      status: response.data.schemeStatus,
      dataPoints,
      nextSteps: [
        'Configure pricing with setup_pricing tool',
        'Create verification programs with create_verification_programs tool',
      ],
    };
  } catch (error: any) {
    throw new Error(`Schema creation failed: ${error.message}`);
  }
}
