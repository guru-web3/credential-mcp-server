/**
 * List verification programs for the authenticated verifier.
 * Uses same endpoint and body as dashboard: POST /management/program/query
 * with x-verifier-id and x-dashboard-auth.
 */

import { z } from 'zod';
import { session } from '../session.js';
import { apiRequest } from '../utils/api.js';

export const ListVerificationProgramsArgsSchema = z.object({
  page: z.coerce.number().min(1).default(1).describe('Page number (1-based)'),
  size: z.coerce.number().min(1).max(100).default(20).describe('Page size'),
  searchStr: z.string().optional().describe('Optional search string'),
  sortField: z.string().default('uvpi.create_at').describe('Sort field'),
  order: z.union([z.enum(['asc', 'desc']), z.string().transform((s) => (String(s).toLowerCase() === 'asc' ? 'asc' : 'desc'))]).default('desc').describe('Sort order'),
});

export type ListVerificationProgramsArgs = z.infer<typeof ListVerificationProgramsArgsSchema>;

interface ProgramRecord {
  id?: string;
  programName?: string;
  status?: string;
  create_at?: string;
  [key: string]: unknown;
}

interface ListResult {
  records?: ProgramRecord[];
  total?: number;
}

export async function listVerificationPrograms(
  args: ListVerificationProgramsArgs
): Promise<{ programs: ProgramRecord[]; total: number; verifierId: string }> {
  const verifierId = session.get('verifierId');
  if (!verifierId) {
    throw new Error('No verifier ID in session. Use credential_authenticate first.');
  }

  const validated = ListVerificationProgramsArgsSchema.parse(args);
  const body = {
    page: validated.page,
    size: validated.size,
    verifierId,
    searchStr: validated.searchStr ?? '',
    sorts: [
      {
        field: validated.sortField,
        sort: validated.order === 'asc' ? 1 : -1,
      },
    ],
  };

  const response = await apiRequest<{ list?: ListResult }>(
    'POST',
    '/management/program/query',
    body,
    { 'x-verifier-id': verifierId }
  );

  const list = response.data?.list;
  const records = list?.records ?? [];
  const total = list?.total ?? 0;

  return {
    programs: records,
    total,
    verifierId,
  };
}
