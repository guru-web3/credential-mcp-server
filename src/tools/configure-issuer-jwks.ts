/**
 * Configure JWKS URL and whitelist domain in the credential Partner Dashboard in one call.
 * Accepts an origin (e.g. https://localhost:3000 or tunnel URL), derives hostname and JWKS URL,
 * optionally probes the JWKS endpoint after server is up, then PATCHes partner settings.
 */

import { z } from 'zod';
import axios from 'axios';
import { session } from '../session.js';
import { apiRequest } from '../utils/api.js';

export const ConfigureIssuerJwksArgsSchema = z.object({
  origin: z
    .string()
    .url()
    .transform((url) => {
      const u = new URL(url);
      u.pathname = u.pathname.replace(/\/+$/, '') || '/';
      return u.origin + u.pathname;
    })
    .describe('Base URL of the issuance app (e.g. https://localhost:3000 or https://abc.ngrok.io). No trailing slash.'),
  probeBeforeUpdate: z
    .boolean()
    .optional()
    .default(true)
    .describe('If true, GET the JWKS URL before updating; if not reachable, return error so user can start server and retry.'),
  replaceDomains: z
    .boolean()
    .optional()
    .default(false)
    .describe('If true, set allowed domains to only the new hostname; if false, merge into existing (max 3).'),
});

export type ConfigureIssuerJwksArgs = z.infer<typeof ConfigureIssuerJwksArgsSchema>;

interface PartnerData {
  allowedDomains?: string[];
  jwksUrl?: string;
  [key: string]: unknown;
}

const JWKS_PROBE_TIMEOUT_MS = 5000;

function normalizeOrigin(origin: string): { origin: string; hostname: string; jwksUrl: string } {
  const u = new URL(origin);
  const o = u.origin;
  const hostname = u.hostname;
  const jwksUrl = o.endsWith('/') ? `${o.replace(/\/$/, '')}/jwks.json` : `${o}/jwks.json`;
  return { origin: o, hostname, jwksUrl };
}

async function probeJwksUrl(jwksUrl: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await axios.get(jwksUrl, {
      timeout: JWKS_PROBE_TIMEOUT_MS,
      validateStatus: () => true,
    });
    if (res.status !== 200) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const data = res.data;
    if (!data || typeof data !== 'object' || !Array.isArray(data.keys)) {
      return { ok: false, error: 'Response is not a valid JWKS (missing keys array)' };
    }
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export async function configureIssuerJwks(args: ConfigureIssuerJwksArgs): Promise<{
  success: boolean;
  jwksUrl?: string;
  hostname?: string;
  allowedDomains?: string[];
  error?: string;
}> {
  session.requireAuth();

  const issuerId = session.get('issuerId');
  if (!issuerId) {
    return {
      success: false,
      error: 'No issuer ID in session. Re-connect to the MCP server to authenticate.',
    };
  }

  const { origin, probeBeforeUpdate, replaceDomains } = ConfigureIssuerJwksArgsSchema.parse(args);
  const { hostname, jwksUrl } = normalizeOrigin(origin);

  if (probeBeforeUpdate) {
    const probe = await probeJwksUrl(jwksUrl);
    if (!probe.ok) {
      return {
        success: false,
        error: `JWKS endpoint not reachable at ${jwksUrl} (${probe.error ?? 'unknown'}). Ensure the issuance app is running and try again.`,
        jwksUrl,
        hostname,
      };
    }
  }

  let allowedDomains: string[];

  if (replaceDomains) {
    allowedDomains = [hostname];
  } else {
    const partnerRes = await apiRequest<PartnerData>('GET', '/partner', undefined, {
      'x-issuer-id': issuerId,
    });
    const existing = (partnerRes.data?.allowedDomains ?? []).filter(
      (d: unknown): d is string => typeof d === 'string' && d.length > 0
    );
    const merged = [...new Set([...existing, hostname])].slice(0, 3);
    allowedDomains = merged;
  }

  await apiRequest<PartnerData>('PATCH', '/partner', { jwksUrl, allowedDomains }, {
    'x-issuer-id': issuerId,
  });

  return {
    success: true,
    jwksUrl,
    hostname,
    allowedDomains,
  };
}
