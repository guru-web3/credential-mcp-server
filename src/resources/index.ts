/**
 * MCP Resources: static list and read by URI.
 * URIs: credential://docs/issuance | verification | both, credential://template-info/issuance | verifier
 */

import { credentialDocs } from '../tools/credential-docs.js';
import { getTemplateInfo } from '../tools/template-info.js';

const RESOURCE_LIST = [
  {
    uri: 'credential://docs/issuance',
    name: 'Issuance docs',
    description: 'Step-by-step issuance flow (Quickstart 2)',
    mimeType: 'text/markdown',
  },
  {
    uri: 'credential://docs/verification',
    name: 'Verification docs',
    description: 'Step-by-step verification flow (Quickstart 3)',
    mimeType: 'text/markdown',
  },
  {
    uri: 'credential://docs/both',
    name: 'Issuance + verification docs',
    description: 'Both issuance and verification flows',
    mimeType: 'text/markdown',
  },
  {
    uri: 'credential://template-info/issuance',
    name: 'Issuance template info',
    description: 'Repo URL, branch, clone command for issuance app',
    mimeType: 'application/json',
  },
  {
    uri: 'credential://template-info/verifier',
    name: 'Verifier template info',
    description: 'Repo URL, branch, clone command for verifier app',
    mimeType: 'application/json',
  },
] as const;

export function listResources(): { uri: string; name: string; description?: string; mimeType?: string }[] {
  return RESOURCE_LIST.map(({ uri, name, description, mimeType }) => ({ uri, name, description, mimeType }));
}

export async function readResource(uri: string): Promise<{ uri: string; mimeType: string; text: string } | null> {
  if (uri.startsWith('credential://docs/')) {
    const flow = uri.replace('credential://docs/', '') as 'issuance' | 'verification' | 'both';
    if (flow !== 'issuance' && flow !== 'verification' && flow !== 'both') return null;
    const result = await credentialDocs({ flow });
    return { uri, mimeType: 'text/markdown', text: result.markdown };
  }
  if (uri.startsWith('credential://template-info/')) {
    const appType = uri.replace('credential://template-info/', '') as 'issuance' | 'verifier';
    if (appType !== 'issuance' && appType !== 'verifier') return null;
    const info = await getTemplateInfo({ appType });
    return { uri, mimeType: 'application/json', text: JSON.stringify(info, null, 2) };
  }
  return null;
}
