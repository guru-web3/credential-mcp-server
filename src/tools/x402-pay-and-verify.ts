/**
 * MCP tool: x402_pay_and_verify
 *
 * Calls x402-gated credential APIs, automatically paying with X402USD8 on Moca Chain.
 * The AI agent simply calls this tool with a URL — payment is handled transparently.
 */

import { z } from 'zod';
import { getPayingFetch, getX402PayerAddress } from '../utils/x402.js';

export const X402PayAndVerifyArgsSchema = z.object({
  url: z.string().describe('Full URL of the x402-protected endpoint to call'),
  method: z.enum(['GET', 'POST']).default('GET').describe('HTTP method (default GET)'),
  body: z.record(z.unknown()).optional().describe('Optional JSON body for POST requests'),
});

type X402PayAndVerifyArgs = z.infer<typeof X402PayAndVerifyArgsSchema>;

export async function x402PayAndVerify(args: X402PayAndVerifyArgs): Promise<unknown> {
  const payingFetch = getPayingFetch();
  if (!payingFetch) {
    return {
      error: 'x402 payments not available — CREDENTIAL_MCP_PRIVATE_KEY is not set.',
      hint: 'Set CREDENTIAL_MCP_PRIVATE_KEY in .env to enable on-chain x402 payments.',
    };
  }

  const payerAddress = getX402PayerAddress();

  try {
    const init: RequestInit = { method: args.method };
    if (args.method === 'POST' && args.body) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(args.body);
    }

    const response = await payingFetch(args.url, init);
    const status = response.status;

    // Decode payment-response header if present
    let paymentInfo: Record<string, unknown> | null = null;
    const paymentResponseHeader = response.headers.get('payment-response');
    if (paymentResponseHeader) {
      try {
        paymentInfo = JSON.parse(
          Buffer.from(paymentResponseHeader, 'base64').toString('utf-8'),
        );
      } catch {
        paymentInfo = { raw: paymentResponseHeader };
      }
    }

    const text = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (status === 200) {
      return {
        success: true,
        status,
        payer: payerAddress,
        payment: paymentInfo,
        data,
      };
    }

    if (status === 402) {
      // Decode payment-required header for context
      let requirements: unknown = null;
      const paymentRequiredHeader = response.headers.get('payment-required');
      if (paymentRequiredHeader) {
        try {
          requirements = JSON.parse(
            Buffer.from(paymentRequiredHeader, 'base64').toString('utf-8'),
          );
        } catch {
          // ignore
        }
      }

      return {
        success: false,
        status,
        error: 'Payment failed or was rejected',
        payer: payerAddress,
        payment: paymentInfo,
        requirements,
        data,
      };
    }

    return {
      success: false,
      status,
      payer: payerAddress,
      data,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: message,
      payer: payerAddress,
    };
  }
}
