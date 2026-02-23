import { z } from 'zod';
import CryptoJS from 'crypto-js';
import { session } from '../session.js';
import { apiRequest } from '../utils/api.js';

const OPERATORS = ['>', '>=', '<', '<=', '=', '!='] as const;
const operatorEnum = z.enum(OPERATORS);

export const CreateProgramsArgsSchema = z.object({
  schemaId: z.string().optional().describe('Schema ID (uses last created schema if not provided)'),
  deploy: z.coerce.boolean().optional().default(true).describe('If true (default), deploy each program after create (status DEPLOYING_W) so it becomes active.'),
  programs: z.array(z.object({
    programName: z.string().describe('Unique program name (e.g., nft_holder_standard)'),
    conditions: z
      .array(
        z.object({
          attribute: z.string().describe('Schema attribute to verify'),
          operator: z
            .union([operatorEnum, z.string().transform((s) => (OPERATORS.includes(String(s).trim() as typeof OPERATORS[number]) ? String(s).trim() as typeof OPERATORS[number] : '='))])
            .describe('Comparison operator'),
          value: z.union([z.string(), z.coerce.number(), z.coerce.boolean()]).describe('Value to compare against'),
        })
      )
      .min(1, 'At least one condition is required per program')
      .describe('Verification conditions (all must be true)'),
  }))
  .min(1, 'At least one program is required')
  .describe('List of verification programs to create'),
});

/**
 * Map to circuit operators. Dashboard/API may not support $gte/$lte; convert to $gt/$lt for integers.
 */
function mapOperatorAndValue(operator: string, value: string | number | boolean): { op: string; value: string | number | boolean } {
  const num = typeof value === 'number' ? value : Number(value);
  const isInt = Number.isInteger(num);
  if (operator === '>=' && isInt) {
    return { op: '$gt', value: num - 1 };
  }
  if (operator === '<=' && isInt) {
    return { op: '$lt', value: num + 1 };
  }
  const operatorMap: Record<string, string> = {
    '>': '$gt',
    '>=': '$gte',
    '<': '$lt',
    '<=': '$lte',
    '=': '$eq',
    '!=': '$ne',
  };
  return { op: operatorMap[operator] || operator, value };
}

function buildCredentialSubjectQuery(conditions: any[]) {
  const credentialSubject: Record<string, any> = {};
  conditions.forEach(condition => {
    const { op, value } = mapOperatorAndValue(condition.operator, condition.value);
    credentialSubject[condition.attribute] = { [op]: value };
  });
  return credentialSubject;
}

/** Dashboard format: [attributeId] + sha1(value) */
function generateZkQueryName(attributeId: string, value: string | number | boolean): string {
  const sha1Hash = CryptoJS.SHA1(String(value)).toString();
  return `[${attributeId}]${sha1Hash}`;
}

interface SchemeByIdData {
  schemeId: string;
  schemeType: string;
  schemeTitle?: string;
  schemeDstorageId?: string;
  /** API returns these; prefer jsonLdUrl for zkQuery context */
  jsonLdUrl?: string;
  schemeUrl?: string;
  schemeAttributes?: { uris?: { jsonLdContext?: string } };
}

export async function createVerificationPrograms(args: z.infer<typeof CreateProgramsArgsSchema>) {
  session.requireAuth();

  const { schemaId: providedSchemaId, deploy: shouldDeploy, programs } = args;

  const schemaId = providedSchemaId || session.get('schemaId');
  if (!schemaId) {
    throw new Error('No schema ID provided. Create a schema first or provide schemaId parameter.');
  }

  const issuerDid = session.get('issuerDid');
  if (!issuerDid) {
    throw new Error('No issuer DID found in session. Please authenticate first.');
  }

  const issuerId = session.get('issuerId');
  const verifierId = session.get('verifierId');
  const apiUrl = session.get('apiUrl') || 'https://credential.api.staging.air3.com';

  // Fetch schema by ID so zkQuery uses correct type and context (required for backend validation)
  let schemaType = session.get('schemaType');
  let schemaContext = session.get('schemaContext') || 'https://www.w3.org/2018/credentials/v1';
  try {
    const schemeRes = await apiRequest<unknown>(
      'POST',
      '/management/scheme/queryById',
      { schemeId: schemaId },
      { 'x-issuer-id': issuerId! }
    );
    const schemaData = (schemeRes as any).data as SchemeByIdData | undefined;
    if (schemaData) {
      schemaType = schemaType ?? schemaData.schemeType;
      // Prefer JSON-LD context URL from API, then schema URL, then build from dstorage ID
      if (schemaData.schemeAttributes?.uris?.jsonLdContext) {
        schemaContext = schemaData.schemeAttributes.uris.jsonLdContext;
      } else if (schemaData.jsonLdUrl) {
        schemaContext = schemaData.jsonLdUrl;
      } else if (schemaData.schemeUrl) {
        schemaContext = schemaData.schemeUrl;
      } else if (schemaData.schemeDstorageId) {
        schemaContext = `${apiUrl}/dstorage/download/${schemaData.schemeDstorageId}`;
      }
    }
  } catch (e) {
    console.error('[DEBUG] Could not fetch schema for type/context, using session/default:', (e as Error).message);
  }

  if (!schemaType) {
    throw new Error('Schema type is required for zkQuery. Fetch schema by schemaId failed or schema has no schemeType.');
  }

  console.log('[DEBUG] Using schemaType:', schemaType, 'schemaContext:', schemaContext?.slice(0, 60) + (schemaContext && schemaContext.length > 60 ? '...' : ''));

  const createdPrograms: Array<{ programId: string; programName: string }> = [];
  const errors: Array<{ programName: string; error: string }> = [];

  for (const program of programs) {
    try {
      const credentialSubject = buildCredentialSubjectQuery(program.conditions);
      const zkQueryPayload = {
        circuitId: 'credentialAtomicQueryMTPV2OnChain',
        query: {
          skipClaimRevocationCheck: true,
          allowedIssuers: [issuerDid],
          context: schemaContext,
          type: schemaType,
          credentialSubject,
        },
      };

      const zkQueryPayloadStr = JSON.stringify(zkQueryPayload);

      const firstCondition = program.conditions[0];
      const zkQueryName =
        firstCondition != null
          ? generateZkQueryName(firstCondition.attribute, firstCondition.value)
          : program.programName;

      const programData = {
        verifierProgramInfoVO: {
          programName: program.programName,
          outChainId: '',
          status: 'CREATED',
          pricingModel: 'pay_on_success',
          complianceAccessKeyRequired: 0,
          issuerDids: [{ did: issuerDid, pricingId: null }],
        },
        zkQueryInfoVOS: [
          {
            zkQueryName,
            zkQueryPayload: zkQueryPayloadStr,
            schemeId: schemaId,
            zkQueryStatus: 'DRAFT',
            circuitId: 'credentialAtomicQueryMTPV2OnChain',
          },
        ],
      };

      console.log(`[DEBUG] Creating program: ${program.programName}`);
      console.log('[DEBUG] zkQueryPayload.query (type, context, credentialSubject):', JSON.stringify({ type: schemaType, context: schemaContext, credentialSubject }, null, 2));
      console.log('[DEBUG] Full program request body:', JSON.stringify(programData, null, 2));

      // Program create: dashboard sends only x-verifier-id (no x-issuer-id)
      const response = await apiRequest<{ programId: string; zkQueryInfoVOS?: any[] }>(
        'POST',
        '/management/program/create',
        programData,
        { 'x-verifier-id': verifierId! }
      );

      const respData = (response as any).data ?? response;
      const programId = respData.programId ?? (response as any).programId;
      if (!programId) {
        throw new Error('API did not return programId');
      }

      let zkQueryInfoVOS: any[] = respData.zkQueryInfoVOS ?? [];
      if (shouldDeploy) {
        if (!zkQueryInfoVOS || zkQueryInfoVOS.length === 0) {
          try {
            const queryRes = await apiRequest<unknown>(
              'POST',
              '/management/zkquery/query',
              { programId },
              { 'x-verifier-id': verifierId! }
            );
            const queryData = (queryRes as any).data;
            zkQueryInfoVOS = Array.isArray(queryData) ? queryData : queryData?.list ?? [];
          } catch (e) {
            console.error('[DEBUG] Could not fetch zkQuery for deploy:', (e as Error).message);
          }
        }
        if (zkQueryInfoVOS && zkQueryInfoVOS.length > 0) {
          try {
            const deployBody = {
              verifierProgramInfoVO: {
                programId,
                status: 'DEPLOYING_W',
                outChainId: '',
              },
              zkQueryInfoVOS,
            };
            console.log(`[DEBUG] Deploying program ${program.programName} (${programId})...`);
            await apiRequest('POST', '/management/program/modify', deployBody, {
              'x-verifier-id': verifierId!,
            });
            console.log(`[DEBUG] ✅ Program deployed: ${program.programName}`);
          } catch (e) {
            console.error(`[DEBUG] Deploy failed for ${program.programName}:`, (e as Error).message);
          }
        } else {
          console.log(`[DEBUG] Skipping deploy (no zkQueryInfoVOS): ${program.programName}`);
        }
      }

      createdPrograms.push({
        programId,
        programName: program.programName,
      });

      console.log(`[DEBUG] ✅ Program created: ${program.programName} (${programId})`);
    } catch (error: any) {
      console.error(`[DEBUG] ❌ Failed to create program ${program.programName}:`, error.message);
      if (error.response?.data) {
        console.error('[DEBUG] Raw error response:', JSON.stringify(error.response.data, null, 2));
      }
      const apiResp = error.apiResponse ?? error.response?.data;
      let errorMessage = error.message;
      if (errorMessage.includes('system error') && !errorMessage.includes('Troubleshooting')) {
        const hint = ' Troubleshooting: 1) Ensure the issuer DID is registered for this verifier. 2) Ensure the schema exists and is published. 3) Check credential API backend logs for the real exception (SYSTEM_ERROR masks it).';
        errorMessage = errorMessage + hint;
        if (apiResp) {
          errorMessage += ` Full API response: ${JSON.stringify(apiResp)}`;
        }
      }
      errors.push({
        programName: program.programName,
        error: errorMessage,
      });
    }
  }

  return {
    success: true,
    message: `Created ${createdPrograms.length} of ${programs.length} programs${shouldDeploy ? ' and deployed' : ''}.`,
    createdPrograms,
    errors: errors.length > 0 ? errors : undefined,
    nextSteps: shouldDeploy
      ? ['Programs are deployed (DEPLOYING_W). Use programId in verifyCredential.']
      : ['Programs are in DRAFT. Deploy via dashboard or call with deploy: true.', 'Test verification flow.'],
  };
}
