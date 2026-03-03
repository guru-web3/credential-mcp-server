/**
 * Optional chain wallet from env (CREDENTIAL_MCP_PRIVATE_KEY or CREDENTIAL_MCP_SEED_PHRASE).
 * When set, enables on-chain tools (set price, payment deposit/withdraw/claim, stake/unstake).
 * When not set, tools that require it return a clear error; setup_pricing falls back to setPriceUrl.
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  type WalletClient,
  type PublicClient,
  type Chain,
  type Transport,
} from 'viem';
import { type Account, privateKeyToAccount, mnemonicToAccount } from 'viem/accounts';

import { getMocaRpcUrl, getMocaChainId } from '../config.js';

const WALLET_ENV_PRIVATE_KEY = 'CREDENTIAL_MCP_PRIVATE_KEY';
const WALLET_ENV_SEED_PHRASE = 'CREDENTIAL_MCP_SEED_PHRASE';
const WALLET_ENV_ACCOUNT_INDEX = 'CREDENTIAL_MCP_ACCOUNT_INDEX';

function getChain(): Chain | null {
  const rpcUrl = process.env.MOCA_RPC_URL || getMocaRpcUrl();
  const chainId = process.env.MOCA_CHAIN_ID != null ? parseInt(process.env.MOCA_CHAIN_ID, 10) : getMocaChainId();
  if (!rpcUrl || Number.isNaN(chainId)) return null;
  return {
    id: chainId,
    name: 'MOCA',
    nativeCurrency: { name: 'MOCA', symbol: 'MOCA', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  } as Chain;
}

function getAccount(): Account | null {
  const pk = process.env[WALLET_ENV_PRIVATE_KEY];
  if (pk) {
    const key = pk.startsWith('0x') ? pk as `0x${string}` : `0x${pk}`;
    try {
      return privateKeyToAccount(key as `0x${string}`);
    } catch {
      return null;
    }
  }
  const seed = process.env[WALLET_ENV_SEED_PHRASE];
  if (seed && seed.trim().length > 0) {
    try {
      const index = parseInt(process.env[WALLET_ENV_ACCOUNT_INDEX] ?? '0', 10);
      return mnemonicToAccount(seed.trim(), { addressIndex: index }) as Account;
    } catch {
      return null;
    }
  }
  return null;
}

let cachedWalletClient: WalletClient<Transport, Chain> | null = null;
let cachedPublicClient: PublicClient<Transport, Chain> | null = null;

/**
 * Returns a viem WalletClient for the MOCA chain when CREDENTIAL_MCP_PRIVATE_KEY or
 * CREDENTIAL_MCP_SEED_PHRASE is set. Otherwise null.
 */
export function getChainWalletClient(): WalletClient<Transport, Chain> | null {
  if (cachedWalletClient !== null) return cachedWalletClient;
  const account = getAccount();
  const chain = getChain();
  if (!account || !chain) return null;
  const rpcUrl = process.env.MOCA_RPC_URL || getMocaRpcUrl();
  cachedWalletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });
  return cachedWalletClient;
}

/**
 * Returns a viem PublicClient for the MOCA chain when MOCA_RPC_URL and MOCA_CHAIN_ID are set.
 * Used for read-only contract calls; does not require a private key.
 */
export function getChainPublicClient(): PublicClient<Transport, Chain> | null {
  if (cachedPublicClient !== null) return cachedPublicClient;
  const chain = getChain();
  if (!chain) return null;
  const rpcUrl = process.env.MOCA_RPC_URL || getMocaRpcUrl();
  cachedPublicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
  return cachedPublicClient;
}

/** True if env is configured for on-chain writes (key/seed + chain). */
export function hasChainWallet(): boolean {
  return getAccount() !== null && getChain() !== null;
}

/** Clear cached clients (e.g. for tests). */
export function clearChainWalletCache(): void {
  cachedWalletClient = null;
  cachedPublicClient = null;
}
