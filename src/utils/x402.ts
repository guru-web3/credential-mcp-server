/**
 * x402 payment-enabled fetch for AI agent use.
 *
 * Wraps the native `fetch` with automatic 402 payment handling using
 * the MCP server's wallet (CREDENTIAL_MCP_PRIVATE_KEY) on Moca Chain.
 *
 * When the agent calls an x402-protected API:
 * 1. Initial GET → receives 402 with payment requirements
 * 2. Signs an EIP-3009 transferWithAuthorization off-chain
 * 3. Retries with PAYMENT-SIGNATURE header
 * 4. Returns the paid-for response (200 + data)
 */

import { x402Client } from '@x402/core/client';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { toClientEvmSigner } from '@x402/evm';
import { wrapFetchWithPayment } from '@x402/fetch';
import { createPublicClient, http, type Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getMocaRpcUrl, getMocaChainId } from '../config.js';

let cachedPayingFetch: typeof globalThis.fetch | null = null;

function getX402Config() {
  const pk = process.env.CREDENTIAL_MCP_PRIVATE_KEY;
  if (!pk) return null;

  const rpcUrl = process.env.MOCA_RPC_URL || getMocaRpcUrl();
  const chainId = process.env.MOCA_CHAIN_ID ? parseInt(process.env.MOCA_CHAIN_ID, 10) : getMocaChainId();

  const chain: Chain = {
    id: chainId,
    name: 'MOCA',
    nativeCurrency: { name: 'MOCA', symbol: 'MOCA', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  } as Chain;

  return { pk, rpcUrl, chainId, chain };
}

/**
 * Returns a fetch function that automatically handles x402 payments.
 * Uses the MCP server's wallet for signing EIP-3009 authorizations.
 * Returns null if no private key is configured.
 */
export function getPayingFetch(): typeof globalThis.fetch | null {
  if (cachedPayingFetch) return cachedPayingFetch;

  const config = getX402Config();
  if (!config) return null;

  const privateKey = (config.pk.startsWith('0x') ? config.pk : `0x${config.pk}`) as `0x${string}`;
  const account = privateKeyToAccount(privateKey);

  const publicClient = createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl),
  });

  const signer = toClientEvmSigner(account, publicClient);
  const network = `eip155:${config.chainId}` as const;

  const client = new x402Client();
  client.register(network as `${string}:${string}`, new ExactEvmScheme(signer));

  cachedPayingFetch = wrapFetchWithPayment(fetch, client);
  return cachedPayingFetch;
}

/** Returns the wallet address used for x402 payments, or null. */
export function getX402PayerAddress(): string | null {
  const config = getX402Config();
  if (!config) return null;
  const privateKey = (config.pk.startsWith('0x') ? config.pk : `0x${config.pk}`) as `0x${string}`;
  return privateKeyToAccount(privateKey).address;
}

/** Clear cached paying fetch (for tests or env changes). */
export function clearX402Cache(): void {
  cachedPayingFetch = null;
}
