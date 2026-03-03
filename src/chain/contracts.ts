/**
 * Contract instances for Payments Controller and Issuer Staking Controller.
 * Addresses come from env or config (by CREDENTIAL_MCP_ENVIRONMENT: devnet for staging/sandbox, testnet for production).
 */

import { getContract } from 'viem';
import { getChainWalletClient, getChainPublicClient } from './wallet.js';
import { getMocaPaymentsContract, getMocaIssuerStakingControllerAddress } from '../config.js';
import { PAYMENTS_CONTROLLER_ABI } from './paymentsControllerAbi.js';
import { ISSUER_STAKING_CONTROLLER_ABI } from './issuerStakingControllerAbi.js';

function toAddress(raw: string | undefined): `0x${string}` | null {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
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
  const address = toAddress(process.env.MOCA_PAYMENTS_CONTRACT || getMocaPaymentsContract());
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
  const address = toAddress(process.env.MOCA_PAYMENTS_CONTRACT || getMocaPaymentsContract());
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
  const address = toAddress(process.env.MOCA_ISSUER_STAKING_CONTROLLER_ADDRESS || getMocaIssuerStakingControllerAddress());
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
  const address = toAddress(process.env.MOCA_ISSUER_STAKING_CONTROLLER_ADDRESS || getMocaIssuerStakingControllerAddress());
  if (!publicClient || !address) return null;
  return getContract({
    address,
    abi: ISSUER_STAKING_CONTROLLER_ABI,
    client: publicClient,
  }) as IssuerStakingControllerContract;
}
