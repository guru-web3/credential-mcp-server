/**
 * Contract instances for Payments Controller and Issuer Staking Controller.
 * Require chain wallet env and contract address env to be set.
 */

import { getContract } from 'viem';
import { getChainWalletClient, getChainPublicClient } from './wallet.js';
import { PAYMENTS_CONTROLLER_ABI } from './paymentsControllerAbi.js';
import { ISSUER_STAKING_CONTROLLER_ABI } from './issuerStakingControllerAbi.js';

const MOCA_PAYMENTS_CONTRACT = 'MOCA_PAYMENTS_CONTRACT';
const MOCA_ISSUER_STAKING_CONTROLLER_ADDRESS = 'MOCA_ISSUER_STAKING_CONTROLLER_ADDRESS';

const DEFAULT_ISSUER_STAKING_CONTROLLER = '0x238e4AA1a6CF2A774079E73019402Beb03F3a7b5';

function toAddress(envKey: string, defaultVal?: string): `0x${string}` | null {
  const raw = process.env[envKey] ?? defaultVal;
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  return s.startsWith('0x') ? (s as `0x${string}`) : (`0x${s}` as `0x${string}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PaymentsControllerContract = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IssuerStakingControllerContract = any;

/**
 * Payments Controller contract (write) for set price, deposit, withdraw, claimFees.
 * Returns null if wallet or contract address env is not set.
 */
export function getPaymentsControllerContract(): PaymentsControllerContract | null {
  const wallet = getChainWalletClient();
  const address = toAddress(MOCA_PAYMENTS_CONTRACT);
  if (!wallet || !address) return null;
  return getContract({
    address,
    abi: PAYMENTS_CONTROLLER_ABI,
    client: wallet,
  }) as PaymentsControllerContract;
}

/**
 * Payments Controller read-only (public client). Works without private key.
 */
export function getPaymentsControllerReadContract(): PaymentsControllerContract | null {
  const publicClient = getChainPublicClient();
  const address = toAddress(MOCA_PAYMENTS_CONTRACT);
  if (!publicClient || !address) return null;
  return getContract({
    address,
    abi: PAYMENTS_CONTROLLER_ABI,
    client: publicClient,
  }) as PaymentsControllerContract;
}

/**
 * Issuer Staking Controller contract (write) for stakeMoca, initiateUnstake, claimUnstake.
 */
export function getIssuerStakingControllerContract(): IssuerStakingControllerContract | null {
  const wallet = getChainWalletClient();
  const address = toAddress(MOCA_ISSUER_STAKING_CONTROLLER_ADDRESS, DEFAULT_ISSUER_STAKING_CONTROLLER);
  if (!wallet || !address) return null;
  return getContract({
    address,
    abi: ISSUER_STAKING_CONTROLLER_ABI,
    client: wallet,
  }) as IssuerStakingControllerContract;
}

/**
 * Issuer Staking Controller read-only.
 */
export function getIssuerStakingControllerReadContract(): IssuerStakingControllerContract | null {
  const publicClient = getChainPublicClient();
  const address = toAddress(MOCA_ISSUER_STAKING_CONTROLLER_ADDRESS, DEFAULT_ISSUER_STAKING_CONTROLLER);
  if (!publicClient || !address) return null;
  return getContract({
    address,
    abi: ISSUER_STAKING_CONTROLLER_ABI,
    client: publicClient,
  }) as IssuerStakingControllerContract;
}
