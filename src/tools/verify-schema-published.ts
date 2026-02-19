import { z } from 'zod';
import { apiRequest } from '../utils/api.js';
import { session } from '../session.js';
import axios from 'axios';

const VerifySchemaPublishedArgsSchema = z.object({
  schemaId: z.string().optional().describe('The schema ID to verify (uses current session schemaId if not provided)'),
});

export const verifySchemaPublishedTool = {
  name: 'credential_verify_schema_published',
  description: 'Verify that a schema is published to OSS and accessible. Use this before creating programs.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      schemaId: {
        type: 'string',
        description: 'The schema ID to verify (optional, uses current session schemaId if not provided)',
      },
    },
  },
};

export async function verifySchemaPublished(args: z.infer<typeof VerifySchemaPublishedArgsSchema>) {
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
    console.error(`\n🔍 Verifying schema ${schemaId}...`);

    // Query schema details
    const response = await apiRequest<{
      schemeId: string;
      schemeTitle: string;
      schemeType: string;
      schemeDstorageId?: string;
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

    const schemaData = response.data;
    console.error(`   Schema: ${schemaData.schemeTitle} (${schemaData.schemeType})`);
    
    if (!schemaData.schemeDstorageId) {
      console.error(`   ✗ Not published to OSS yet`);
      console.error(`   Run credential_publish_schema to publish it`);
      
      return {
        published: false,
        accessible: false,
        message: 'Schema not published to OSS yet. Run credential_publish_schema first.',
        schemaId: schemaId,
      };
    }

    console.error(`   Storage ID: ${schemaData.schemeDstorageId}`);

    // Try to access the schema URL
    const storageUrl = `https://dstorage.zkme.me/api/v1/p/${schemaData.schemeDstorageId}`;
    console.error(`   Checking accessibility...`);
    
    try {
      const storageResponse = await axios.get(storageUrl, { 
        timeout: 10000,
        validateStatus: (status) => status < 500
      });
      
      if (storageResponse.status === 200) {
        console.error(`   ✓ Schema is published and accessible`);
        
        return {
          published: true,
          accessible: true,
          message: 'Schema is published and accessible from OSS',
          schemaId: schemaId,
          schemeDstorageId: schemaData.schemeDstorageId,
          storageUrl: storageUrl,
        };
      } else {
        console.error(`   ⚠️  Published but got status ${storageResponse.status}`);
        
        return {
          published: true,
          accessible: false,
          message: `Schema published but returned status ${storageResponse.status}`,
          schemaId: schemaId,
          schemeDstorageId: schemaData.schemeDstorageId,
          storageUrl: storageUrl,
        };
      }
    } catch (storageError: any) {
      console.error(`   ⚠️  Published but not yet accessible (may need time to propagate)`);
      
      return {
        published: true,
        accessible: false,
        message: 'Schema published but not yet accessible. Wait 5-10 seconds and try again.',
        schemaId: schemaId,
        schemeDstorageId: schemaData.schemeDstorageId,
        storageUrl: storageUrl,
        error: storageError.message,
      };
    }
  } catch (error: any) {
    console.error(`   ✗ Verification failed`);
    throw new Error(`Schema verification failed: ${error.message}`);
  }
}

export { VerifySchemaPublishedArgsSchema };
