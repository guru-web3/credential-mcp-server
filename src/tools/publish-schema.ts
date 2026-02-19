import { z } from 'zod';
import { apiRequest } from '../utils/api.js';
import { session } from '../session.js';

const PublishSchemaArgsSchema = z.object({
  schemaId: z.string().optional().describe('The schema ID to publish (uses current session schemaId if not provided)'),
});

export const publishSchemaTool = {
  name: 'credential_publish_schema',
  description: 'Publish a schema to OSS storage. This is REQUIRED before creating verification programs.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      schemaId: {
        type: 'string',
        description: 'The schema ID to publish (optional, uses current session schemaId if not provided)',
      },
    },
  },
};

export async function publishSchema(args: z.infer<typeof PublishSchemaArgsSchema>) {
  session.requireAuth();

  const issuerId = session.get('issuerId');
  if (!issuerId) {
    throw new Error('No issuer ID found. Please authenticate first.');
  }

  const schemaId = args.schemaId || session.get('schemaId');
  if (!schemaId) {
    throw new Error('No schemaId provided. Either pass schemaId or create a schema first.');
  }

  try {
    console.error(`\n📤 Publishing schema ${schemaId} to OSS...`);

    // First, get the schema details
    const schemaResponse = await apiRequest<{
      schemeId: string;
      schemeTitle: string;
      schemeType: string;
      schemeDescription?: string;
      schemeVersion?: string;
      schemeDstorageId?: string;
      attribute?: { data: any[] };
    }>(
      'POST',
      '/management/scheme/query',
      {
        schemeId: schemaId,
      },
      {
        'x-issuer-id': issuerId,
      }
    );

    const schemaData = schemaResponse.data;
    console.error(`   Schema found: ${schemaData.schemeTitle} (${schemaData.schemeType})`);
    
    // Check if already published
    if (schemaData.schemeDstorageId) {
      console.error(`   ✓ Already published to OSS`);
      console.error(`   Storage ID: ${schemaData.schemeDstorageId}`);
      console.error(`   URL: https://dstorage.zkme.me/api/v1/p/${schemaData.schemeDstorageId}`);
      
      return {
        success: true,
        message: 'Schema already published to OSS',
        schemaId: schemaId,
        schemeDstorageId: schemaData.schemeDstorageId,
        storageUrl: `https://dstorage.zkme.me/api/v1/p/${schemaData.schemeDstorageId}`,
        alreadyPublished: true,
      };
    }

    // Publish to OSS
    console.error(`   Publishing to OSS...`);
    const publishResponse = await apiRequest<{
      schemeId: string;
      schemeDstorageId: string;
      schemeTitle: string;
    }>(
      'POST',
      '/management/scheme/publishOnOss',
      {
        credentialSubject: schemaData.attribute?.data || [],
        title: schemaData.schemeTitle,
        description: schemaData.schemeDescription || '',
        schemeType: schemaData.schemeType,
        version: schemaData.schemeVersion || '1.0',
      },
      {
        'x-issuer-id': issuerId,
      }
    );

    const publishedData = publishResponse.data;
    console.error(`   ✓ Published successfully!`);
    console.error(`   Storage ID: ${publishedData.schemeDstorageId}`);
    console.error(`   URL: https://dstorage.zkme.me/api/v1/p/${publishedData.schemeDstorageId}`);

    // Update session with storage ID
    session.set('schemaDstorageId', publishedData.schemeDstorageId);

    return {
      success: true,
      message: 'Schema published successfully to OSS',
      schemaId: publishedData.schemeId,
      schemeDstorageId: publishedData.schemeDstorageId,
      storageUrl: `https://dstorage.zkme.me/api/v1/p/${publishedData.schemeDstorageId}`,
      alreadyPublished: false,
    };
  } catch (error: any) {
    console.error(`   ✗ Failed to publish schema`);
    throw new Error(`Schema publish failed: ${error.message}`);
  }
}

export { PublishSchemaArgsSchema };
