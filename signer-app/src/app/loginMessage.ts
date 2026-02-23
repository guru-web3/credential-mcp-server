/**
 * Build the exact login message the backend expects for signature verification.
 * Must stay in sync with:
 * - credential-api: SignatureCheckHelperImpl.buildMetaMessage (body only; wallet adds Ethereum Signed Message prefix)
 * - credential-mcp-server: get-login-challenge.buildLoginMessage
 */
export function buildLoginMessage(walletAddress: string, isoTimestamp: string): string {
  const addr = walletAddress.toLowerCase();
  return `You are logging into AIR Credential Dashboard with your wallet: ${addr}
Signature approval is required and will not cost any fees.
Timestamp: ${isoTimestamp}`;
}
