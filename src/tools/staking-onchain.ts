/**
 * Issuer staking on-chain tools: stake MOCA, initiate unstake, claim unstake.
 * Require CREDENTIAL_MCP_PRIVATE_KEY or CREDENTIAL_MCP_SEED_PHRASE and chain env.
 */

import { z } from 'zod';
import { parseEther, formatEther } from 'viem';
import {
  getIssuerStakingControllerContract,
  getIssuerStakingControllerReadContract,
  hasChainWallet,
  getChainPublicClient,
  getChainWalletClient,
  MOCA_DEFAULT_GAS_LIMIT,
} from '../chain/index.js';

const WALLET_REQUIRED_MSG =
  'On-chain staking requires CREDENTIAL_MCP_PRIVATE_KEY or CREDENTIAL_MCP_SEED_PHRASE and MOCA_RPC_URL, MOCA_CHAIN_ID (and optionally MOCA_ISSUER_STAKING_CONTROLLER_ADDRESS) in env.';

function requireStakingWallet() {
  if (!hasChainWallet()) throw new Error(WALLET_REQUIRED_MSG);
  const contract = getIssuerStakingControllerContract();
  if (!contract) throw new Error(WALLET_REQUIRED_MSG);
  return contract;
}

export const StakeMocaArgsSchema = z.object({
  amountMoca: z.union([z.string(), z.number()]).transform((v) => (typeof v === 'number' ? String(v) : v)).describe('Amount of MOCA to stake (e.g. "10" for 10 MOCA)'),
});

export async function stakeMoca(args: z.infer<typeof StakeMocaArgsSchema>) {
  const contract = requireStakingWallet();
  const amountInWei = parseEther(args.amountMoca.replace(/,/g, ''));
  const readContract = getIssuerStakingControllerReadContract();
  if (readContract) {
    const maxSingle = await readContract.read.MAX_SINGLE_STAKE_AMOUNT();
    if (amountInWei > maxSingle) {
      throw new Error(`Amount exceeds MAX_SINGLE_STAKE_AMOUNT (${maxSingle}). Use a smaller amount or multiple stakes.`);
    }
  }
  const hash = await contract.write.stakeMoca({ value: amountInWei, gas: MOCA_DEFAULT_GAS_LIMIT });
  const publicClient = getChainPublicClient();
  if (publicClient) {
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') {
      throw new Error(
        `Stake transaction reverted (tx: ${receipt.transactionHash}). Check the block explorer for the revert reason.`
      );
    }
    return { success: true, txHash: receipt.transactionHash, message: `Staked ${args.amountMoca} MOCA. Tx: ${receipt.transactionHash}` };
  }
  return { success: true, txHash: hash, message: `Staked ${args.amountMoca} MOCA. Tx: ${hash}` };
}

export const UnstakeMocaArgsSchema = z.object({
  amountMoca: z.union([z.string(), z.number()]).transform((v) => (typeof v === 'number' ? String(v) : v)).describe('Amount of MOCA to initiate unstake for'),
});

export async function unstakeMoca(args: z.infer<typeof UnstakeMocaArgsSchema>) {
  const contract = requireStakingWallet();
  const amountInWei = parseEther(args.amountMoca.replace(/,/g, ''));
  const walletAddress = getChainWalletClient()?.account?.address;
  if (walletAddress && amountInWei > 0n) {
    const readContract = getIssuerStakingControllerReadContract();
    if (readContract) {
      const mocaStaked = await readContract.read.issuers([walletAddress as `0x${string}`]);
      if (amountInWei > mocaStaked) {
        throw new Error(
          `Cannot unstake more than staked. Staked: ${formatEther(mocaStaked)} MOCA; requested: ${args.amountMoca} MOCA. Reduce the amount.`
        );
      }
    }
  }
  const hash = await contract.write.initiateUnstake([amountInWei], { gas: MOCA_DEFAULT_GAS_LIMIT });
  const publicClient = getChainPublicClient();
  if (publicClient) {
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') {
      throw new Error(
        `Unstake transaction reverted (tx: ${receipt.transactionHash}). ` +
        'Ensure the amount does not exceed your staked MOCA. Check the block explorer for the revert reason.'
      );
    }
    return {
      success: true,
      txHash: receipt.transactionHash,
      message: `Initiated unstake of ${args.amountMoca} MOCA. After UNSTAKE_DELAY, use credential_claim_unstake_moca with the claimable timestamp(s). Tx: ${receipt.transactionHash}`,
    };
  }
  return {
    success: true,
    txHash: hash,
    message: `Initiated unstake of ${args.amountMoca} MOCA. After UNSTAKE_DELAY, use credential_claim_unstake_moca with the claimable timestamp(s). Tx: ${hash}`,
  };
}

export const ClaimUnstakeMocaArgsSchema = z.object({
  timestamps: z.array(z.union([z.number(), z.string()])).transform((arr) => arr.map((t) => (typeof t === 'string' ? BigInt(t) : BigInt(t)))).describe('Array of claimable timestamps from prior initiateUnstake (e.g. from UnstakeInitiated event)'),
});

export async function claimUnstakeMoca(args: z.infer<typeof ClaimUnstakeMocaArgsSchema>) {
  const contract = requireStakingWallet();
  const hash = await contract.write.claimUnstake([args.timestamps], { gas: MOCA_DEFAULT_GAS_LIMIT });
  const publicClient = getChainPublicClient();
  if (publicClient) {
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') {
      throw new Error(
        `Claim unstake transaction reverted (tx: ${receipt.transactionHash}). ` +
        'Ensure timestamps are after UNSTAKE_DELAY and correspond to prior initiateUnstake. Check the block explorer for the revert reason.'
      );
    }
    return { success: true, txHash: receipt.transactionHash, message: `Claimed unstaked MOCA. Tx: ${receipt.transactionHash}` };
  }
  return { success: true, txHash: hash, message: `Claimed unstaked MOCA. Tx: ${hash}` };
}
