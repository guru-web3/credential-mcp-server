/**
 * List credential templates (issuance programs) for the authenticated issuer.
 * Uses same endpoint and body as dashboard: POST /issuer/credentialTemplateQuery
 * with x-issuer-id and x-dashboard-auth.
 */

import { z } from 'zod';
import { session } from '../session.js';
import { apiRequest } from '../utils/api.js';

export const ListCredentialTemplatesArgsSchema = z.object({
  page: z.number().min(1).default(1).describe('Page number (1-based)'),
  size: z.number().min(1).max(100).default(20).describe('Page size'),
  searchStr: z.string().optional().describe('Optional search string'),
  sortField: z.string().default('create_at').describe('Sort field'),
  order: z.enum(['asc', 'desc']).default('desc').describe('Sort order'),
});

export type ListCredentialTemplatesArgs = z.infer<typeof ListCredentialTemplatesArgsSchema>;

export interface CredentialTemplateRecord {
  id?: string;
  credentialId?: string;
  credentialName?: string;
  schemeType?: string;
  schemeTitle?: string;
  schemeId?: string;
  create_at?: string;
  [key: string]: unknown;
}

interface PageResult {
  records?: CredentialTemplateRecord[];
  total?: number;
}

export async function listCredentialTemplates(
  args: ListCredentialTemplatesArgs
): Promise<{ templates: CredentialTemplateRecord[]; total: number; issuerId: string }> {
  const issuerId = session.get('issuerId');
  if (!issuerId) {
    throw new Error('No issuer ID in session. Use credential_authenticate first.');
  }

  const validated = ListCredentialTemplatesArgsSchema.parse(args);
  const body = {
    size: validated.size,
    page: validated.page,
    searchStr: validated.searchStr ?? '',
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
    '/issuer/credentialTemplateQuery',
    body,
    { 'x-issuer-id': issuerId }
  );

  const page = response.data?.page;
  const records = page?.records ?? [];
  const total = page?.total ?? 0;

  return {
    templates: records,
    total,
    issuerId,
  };
}
