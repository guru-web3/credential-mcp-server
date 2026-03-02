/**
 * Explicit gas limit for MCP contract writes.
 * Prevents "out of gas" when RPC estimate is too low (e.g. on MOCA devnet).
 * Override via MOCA_GAS_LIMIT env if needed.
 */
export const MOCA_DEFAULT_GAS_LIMIT = BigInt(process.env.MOCA_GAS_LIMIT || '800000');
