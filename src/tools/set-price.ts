/**
 * Set verification price on-chain (createSchema or updateSchemaFee).
 * Requires CREDENTIAL_MCP_PRIVATE_KEY or CREDENTIAL_MCP_SEED_PHRASE and chain env.
 */

import { z } from 'zod';
import { parseUnits } from 'viem';
import {
  getPaymentsControllerContract,
  hasChainWallet,
  getChainPublicClient,
  MOCA_DEFAULT_GAS_LIMIT,
} from '../chain/index.js';
import { PAYMENTS_CONTROLLER_ABI } from '../chain/paymentsControllerAbi.js';
import { decodeEventLog } from 'viem';

const USD8_DECIMALS = 8;

export const SetPriceArgsSchema = z.object({
  paymentFeeSchemaId: z
    .string()
    .optional()
    .describe('Existing payment fee schema ID (bytes32 hex). Omit to create a new one.'),
  priceUsd: z.coerce.number().min(0).describe('Price in USD (e.g. 0.1 for $0.10)'),
});

export type SetPriceArgs = z.infer<typeof SetPriceArgsSchema>;

const WALLET_REQUIRED_MSG =
  'On-chain set price requires CREDENTIAL_MCP_PRIVATE_KEY or CREDENTIAL_MCP_SEED_PHRASE and MOCA_RPC_URL, MOCA_CHAIN_ID, MOCA_PAYMENTS_CONTRACT in env.';

export async function setPrice(
  args: SetPriceArgs
): Promise<{ success: boolean; txHash: string; message: string; paymentFeeSchemaId?: string }> {
  if (!hasChainWallet()) {
    throw new Error(WALLET_REQUIRED_MSG);
  }
  const contract = getPaymentsControllerContract();
  if (!contract) {
    throw new Error(WALLET_REQUIRED_MSG);
  }
  const { paymentFeeSchemaId, priceUsd } = args;
  const priceInWei = parseUnits(priceUsd.toString(), USD8_DECIMALS);
  const publicClient = getChainPublicClient();

  if (paymentFeeSchemaId && paymentFeeSchemaId.trim() !== '') {
    const schemaIdHex = paymentFeeSchemaId.startsWith('0x')
      ? (paymentFeeSchemaId as `0x${string}`)
      : (`0x${paymentFeeSchemaId.replace(/^0x/i, '')}` as `0x${string}`);
    const hash = await contract.write.updateSchemaFee([schemaIdHex, priceInWei], { gas: MOCA_DEFAULT_GAS_LIMIT });
    const txHash = publicClient ? (await publicClient.waitForTransactionReceipt({ hash })).transactionHash : hash;
    return {
      success: true,
      txHash,
      message: `Updated schema fee to ${priceUsd} USD on-chain. Tx: ${txHash}`,
      paymentFeeSchemaId: paymentFeeSchemaId,
    };
  }

  const hash = await contract.write.createSchema([priceInWei], { gas: MOCA_DEFAULT_GAS_LIMIT });
  let txHash = hash;
  let newSchemaId: string | undefined;
  if (publicClient) {
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    txHash = receipt.transactionHash;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: PAYMENTS_CONTROLLER_ABI, data: log.data, topics: log.topics });
        if (decoded.eventName === 'SchemaCreated' && decoded.args?.schemaId) {
          newSchemaId =
            typeof decoded.args.schemaId === 'string' ? decoded.args.schemaId : String(decoded.args.schemaId);
          break;
        }
      } catch {
        continue;
      }
    }
  }
  return {
    success: true,
    txHash,
    message: `Created new fee schema with ${priceUsd} USD on-chain. Tx: ${txHash}.${newSchemaId ? ` New paymentFeeSchemaId: ${newSchemaId}` : ''}`,
    paymentFeeSchemaId: newSchemaId,
  };
}
