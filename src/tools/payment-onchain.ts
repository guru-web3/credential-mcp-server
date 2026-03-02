/**
 * Payment controller on-chain tools: deposit (verifier top-up), withdraw (verifier), claimFees (issuer).
 * Require CREDENTIAL_MCP_PRIVATE_KEY or CREDENTIAL_MCP_SEED_PHRASE and chain env.
 */

import { z } from 'zod';
import { parseUnits } from 'viem';
import { getPaymentsControllerContract, hasChainWallet, getChainPublicClient, MOCA_DEFAULT_GAS_LIMIT } from '../chain/index.js';

const USD8_DECIMALS = 8;
const WALLET_REQUIRED_MSG =
  'On-chain payment operations require CREDENTIAL_MCP_PRIVATE_KEY or CREDENTIAL_MCP_SEED_PHRASE and MOCA_RPC_URL, MOCA_CHAIN_ID, MOCA_PAYMENTS_CONTRACT in env.';

function requireWallet() {
  if (!hasChainWallet()) throw new Error(WALLET_REQUIRED_MSG);
  const contract = getPaymentsControllerContract();
  if (!contract) throw new Error(WALLET_REQUIRED_MSG);
  return contract;
}

export const PaymentDepositArgsSchema = z.object({
  verifierAddress: z.string().describe('Verifier address (asset manager) to top up'),
  amountUsd: z.coerce.number().min(0).describe('Amount in USD (USD8)'),
});

export async function paymentDeposit(args: z.infer<typeof PaymentDepositArgsSchema>) {
  const contract = requireWallet();
  const verifier = args.verifierAddress.startsWith('0x') ? args.verifierAddress as `0x${string}` : `0x${args.verifierAddress}`;
  const amountInWei = parseUnits(args.amountUsd.toString(), USD8_DECIMALS);
  const hash = await contract.write.deposit([verifier, amountInWei], { gas: MOCA_DEFAULT_GAS_LIMIT });
  const publicClient = getChainPublicClient();
  const txHash = publicClient ? (await publicClient.waitForTransactionReceipt({ hash })).transactionHash : hash;
  return { success: true, txHash, message: `Deposited ${args.amountUsd} USD8 for verifier. Tx: ${txHash}` };
}

export const PaymentWithdrawArgsSchema = z.object({
  verifierAddress: z.string().describe('Verifier address (asset manager) to withdraw from'),
  amountUsd: z.coerce.number().min(0).describe('Amount in USD (USD8) to withdraw'),
});

export async function paymentWithdraw(args: z.infer<typeof PaymentWithdrawArgsSchema>) {
  const contract = requireWallet();
  const verifier = args.verifierAddress.startsWith('0x') ? args.verifierAddress as `0x${string}` : `0x${args.verifierAddress}`;
  const amountInWei = parseUnits(args.amountUsd.toString(), USD8_DECIMALS);
  const hash = await contract.write.withdraw([verifier, amountInWei], { gas: MOCA_DEFAULT_GAS_LIMIT });
  const publicClient = getChainPublicClient();
  const txHash = publicClient ? (await publicClient.waitForTransactionReceipt({ hash })).transactionHash : hash;
  return { success: true, txHash, message: `Withdrew ${args.amountUsd} USD8 for verifier. Tx: ${txHash}` };
}

export const PaymentClaimFeesArgsSchema = z.object({
  issuerAddress: z.string().describe('Issuer address (asset manager) to claim fees for'),
});

export async function paymentClaimFees(args: z.infer<typeof PaymentClaimFeesArgsSchema>) {
  const contract = requireWallet();
  const issuer = args.issuerAddress.startsWith('0x') ? args.issuerAddress as `0x${string}` : `0x${args.issuerAddress}`;
  const hash = await contract.write.claimFees([issuer], { gas: MOCA_DEFAULT_GAS_LIMIT });
  const publicClient = getChainPublicClient();
  const txHash = publicClient ? (await publicClient.waitForTransactionReceipt({ hash })).transactionHash : hash;
  return { success: true, txHash, message: `Claimed fees for issuer. Tx: ${txHash}` };
}
