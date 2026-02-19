import { z } from 'zod';
import { session } from '../session.js';
import { apiRequest } from '../utils/api.js';

export const CreateProgramsArgsSchema = z.object({
  schemaId: z.string().optional().describe('Schema ID (uses last created schema if not provided)'),
  programs: z.array(z.object({
    programName: z.string().describe('Unique program name (e.g., nft_holder_standard)'),
    conditions: z.array(z.object({
      attribute: z.string().describe('Schema attribute to verify'),
      operator: z.enum(['>', '>=', '<', '<=', '=', '!=']).describe('Comparison operator'),
      value: z.union([z.string(), z.number(), z.boolean()]).describe('Value to compare against'),
    })).describe('Verification conditions (all must be true)'),
  })).describe('List of verification programs to create'),
});

function mapOperator(op: string): string {
  const operatorMap: Record<string, string> = {
    '>': '$gt',
    '>=': '$gte',
    '<': '$lt',
    '<=': '$lte',
    '=': '$eq',
    '!=': '$ne',
  };
  return operatorMap[op] || op;
}

function buildCredentialSubjectQuery(conditions: any[]) {
  const credentialSubject: Record<string, any> = {};
  
  conditions.forEach(condition => {
    credentialSubject[condition.attribute] = {
      [mapOperator(condition.operator)]: condition.value
    };
  });
  
  return credentialSubject;
}

export async function createVerificationPrograms(args: z.infer<typeof CreateProgramsArgsSchema>) {
  session.requireAuth();

  const { schemaId: providedSchemaId, programs } = args;
  
  const schemaId = providedSchemaId || session.get('schemaId');
  if (!schemaId) {
    throw new Error('No schema ID provided. Create a schema first or provide schemaId parameter.');
  }

  const issuerDid = session.get('issuerDid');
  if (!issuerDid) {
    throw new Error('No issuer DID found in session. Please authenticate first.');
  }
  
  // Get issuer and verifier IDs for headers
  const issuerId = session.get('issuerId');
  const verifierId = session.get('verifierId');
  
  // Get schema info to use in zkQuery
  const schemaName = session.get('schemaName') || 'credential';
  const schemaType = session.get('schemaType');
  const schemaContext = session.get('schemaContext') || 'https://www.w3.org/2018/credentials/v1';

  const createdPrograms: Array<{ programId: string; programName: string }> = [];
  const errors: Array<{ programName: string; error: string }> = [];

  for (const program of programs) {
    try {
      // Build zkQuery payload
      const zkQueryPayload = {
        circuitId: 'credentialAtomicQueryMTPV2OnChain',
        query: {
          skipClaimRevocationCheck: true,
          allowedIssuers: [issuerDid],
          context: schemaContext, // Use schema's JSON-LD context
          type: schemaType || schemaName, // Use schemeType as credential type (critical!)
          credentialSubject: buildCredentialSubjectQuery(program.conditions),
        },
      };

      // Stringify the payload as required by API
      const zkQueryPayloadStr = JSON.stringify(zkQueryPayload);

      const programData = {
        verifierProgramInfoVO: {
          programName: program.programName,
          outChainId: '',
          status: 'CREATED',
          pricingModel: 'pay_on_success',
          complianceAccessKeyRequired: 0,
          issuerDids: [
            {
              did: issuerDid,
            },
          ],
        },
        zkQueryInfoVOS: [
          {
            zkQueryName: program.programName,
            zkQueryPayload: zkQueryPayloadStr,
            schemeId: schemaId,
            zkQueryStatus: 'DRAFT',
            circuitId: 'credentialAtomicQueryMTPV2OnChain',
          },
        ],
      };

      console.log(`[DEBUG] Creating program: ${program.programName}`);
      console.log('[DEBUG] Program data:', JSON.stringify(programData, null, 2));

      const response = await apiRequest<{ programId: string }>(
        'POST',
        '/management/program/create',
        programData,
        {
          'x-issuer-id': issuerId!,
          'x-verifier-id': verifierId!,
        }
      );

      createdPrograms.push({
        programId: response.data.programId,
        programName: program.programName,
      });

      console.log(`[DEBUG] ✅ Program created: ${program.programName} (${response.data.programId})`);
    } catch (error: any) {
      console.error(`[DEBUG] ❌ Failed to create program ${program.programName}:`, error.message);
      errors.push({
        programName: program.programName,
        error: error.message,
      });
    }
  }

  return {
    success: true,
    message: `Created ${createdPrograms.length} of ${programs.length} programs`,
    createdPrograms,
    errors: errors.length > 0 ? errors : undefined,
    nextSteps: [
      'Programs are in DRAFT status',
      'Test verification flow',
      'Deploy to production when ready',
    ],
  };
}
