/**
 * Create Credential Template
 * Creates a credential template for an issuer
 */

import { z } from 'zod';
import { session } from '../session.js';
import { apiRequest } from '../utils/api.js';

export const CreateCredentialTemplateArgsSchema = z.object({
  credentialName: z.string().describe('Name of the credential'),
  schemeType: z.string().describe('Schema type identifier'),
  schemeTitle: z.string().describe('Schema title'),
  expirationDuration: z.number().default(365).describe('Expiration duration in days'),
  issueMax: z.number().nullable().default(null).describe('Maximum number of credentials to issue (null for unlimited)'),
  accessibleStartAt: z.string().default('').describe('Start date for accessibility (ISO format or empty)'),
  accessibleEndAt: z.string().default('').describe('End date for accessibility (ISO format or empty)'),
  revokeFlag: z.number().default(0).describe('Revoke flag (0 or 1)'),
  complianceAccessKeyEnabled: z.number().default(0).describe('Compliance access key enabled (0 or 1)'),
});

export async function createCredentialTemplate(
  args: z.infer<typeof CreateCredentialTemplateArgsSchema>
) {
  // Validate inputs
  const validated = CreateCredentialTemplateArgsSchema.parse(args);

  // Get required session data
  const issuerId = session.get('issuerId');
  const schemaId = session.get('schemaId');
  const dashboardToken = session.get('dashboardToken');

  if (!issuerId) {
    throw new Error('No issuer ID found in session. Please authenticate first.');
  }

  if (!schemaId) {
    throw new Error('No schema ID found in session. Please create a schema first.');
  }

  if (!dashboardToken) {
    throw new Error('No dashboard token found in session. Please authenticate first.');
  }

  console.log('[DEBUG] Creating credential template...');

  const templateData = {
    credentialName: validated.credentialName,
    expirationDuration: validated.expirationDuration,
    issueMax: validated.issueMax,
    issuerId,
    schemeType: validated.schemeType,
    schemeTitle: validated.schemeTitle,
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

    // Store template ID in session
    session.set('credentialTemplateId', response.data.credentialId);

    return {
      success: true,
      message: 'Credential template created successfully',
      templateId: response.data.credentialId,
      credentialName: validated.credentialName,
      status: response.data.status,
    };
  } catch (error: any) {
    console.error('[DEBUG] Failed to create credential template:', error.message);
    throw new Error(`Credential template creation failed: ${error.message}`);
  }
}

export const createCredentialTemplateToolDefinition = {
  name: 'create_credential_template',
  description: 'Create a credential template for the issuer. This should be done after creating a schema and before creating verification programs.',
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
};
