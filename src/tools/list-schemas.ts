/**
 * List credential schemas for the authenticated issuer.
 * Uses same endpoint and body as dashboard: POST /management/scheme/query
 * with x-issuer-id and x-dashboard-auth.
 */

import { z } from 'zod';
import { session } from '../session.js';
import { apiRequest } from '../utils/api.js';

const filterTypeEnum = z.enum(['own_schemas', 'other_schemas']).default('own_schemas');
const orderEnum = z.enum(['asc', 'desc']).default('desc');

export const ListSchemasArgsSchema = z.object({
  page: z.coerce.number().min(1).default(1).describe('Page number (1-based)'),
  size: z.coerce.number().min(1).max(100).default(20).describe('Page size'),
  searchStr: z.string().optional().describe('Optional search string'),
  filterType: z
    .union([filterTypeEnum, z.string().transform((s) => (String(s).toLowerCase().includes('other') ? 'other_schemas' : 'own_schemas'))])
    .default('own_schemas')
    .describe('own_schemas = issuer schemas, other_schemas = search others'),
  sortField: z.string().default('create_at').describe('Sort field'),
  order: z.union([orderEnum, z.string().transform((s) => (String(s).toLowerCase() === 'asc' ? 'asc' : 'desc'))]).default('desc').describe('Sort order'),
});

export type ListSchemasArgs = z.infer<typeof ListSchemasArgsSchema>;

interface SchemaRecord {
  schemeId?: string;
  schemaId?: string;
  schemeVersion?: string;
  schemeType?: string;
  schemeTitle?: string;
  create_at?: string;
  [key: string]: unknown;
}

interface PageResult {
  records?: SchemaRecord[];
  total?: number;
}

export async function listSchemas(
  args: ListSchemasArgs
): Promise<{ schemas: SchemaRecord[]; total: number; issuerId: string }> {
  const issuerId = session.get('issuerId');
  if (!issuerId) {
    throw new Error('No issuer ID in session. Re-connect to the MCP server to authenticate.');
  }

  const validated = ListSchemasArgsSchema.parse(args);
  const body = {
    size: validated.size,
    page: validated.page,
    searchStr: validated.searchStr ?? '',
    filterType: validated.filterType,
    issuer_id: issuerId,
    sorts: [
      {
        field: validated.sortField,
        sort: validated.order === 'asc' ? 1 : -1,
      },
    ],
  };

  const response = await apiRequest<{ page?: PageResult }>(
    'POST',
    '/management/scheme/query',
    body,
    { 'x-issuer-id': issuerId }
  );

  const page = response.data?.page;
  const records = page?.records ?? [];
  const total = page?.total ?? 0;

  return {
    schemas: records,
    total,
    issuerId,
  };
}
