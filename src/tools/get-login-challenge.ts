import { z } from 'zod';

export const GetLoginChallengeArgsSchema = z.object({
  walletAddress: z.string().describe('Ethereum wallet address (0x...) that will sign the message'),
  environment: z.enum(['staging', 'production']).default('staging').describe('API environment'),
});

const MAX_CHALLENGE_AGE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Build the exact login message the backend expects (must match SignatureCheckHelperImpl.buildMetaMessage).
 */
export function buildLoginMessage(walletAddress: string, isoTimestamp: string): string {
  const addr = walletAddress.toLowerCase();
  return `You are logging into AIR Credential Dashboard with your wallet: ${addr}
Signature approval is required and will not cost any fees.
Timestamp: ${isoTimestamp}`;
}

export async function getLoginChallenge(args: z.infer<typeof GetLoginChallengeArgsSchema>) {
  const { walletAddress, environment } = args;
  const addr = walletAddress.startsWith('0x') ? walletAddress.toLowerCase() : `0x${walletAddress.toLowerCase()}`;

  const date = new Date();
  const timestamp = date.getTime();
  const isoTimestamp = date.toISOString();
  const loginMessage = buildLoginMessage(addr, isoTimestamp);

  const signerBaseUrl = process.env.CREDENTIAL_SIGNER_URL || 'https://credential-challenge-signer.netlify.app';
  const signerUrl = `${signerBaseUrl}/#m=${encodeURIComponent(Buffer.from(loginMessage, 'utf8').toString('base64'))}&t=${timestamp}`;

  return {
    success: true,
    message:
      'Use this challenge to sign in your wallet. Open the signer URL or paste the login message and timestamp into the signer page, then complete authentication via Cursor Connect.',
    environment,
    walletAddress: addr,
    loginMessage,
    timestamp,
    isoTimestamp,
    signerUrl,
    validUntil: new Date(timestamp + MAX_CHALLENGE_AGE_MS).toISOString(),
    nextSteps: [
      `Open the signer page: ${signerUrl}`,
      'Or run "npm run signer" in this repo and paste the message and timestamp into the page.',
      'Sign the message with your wallet, then copy the JSON output.',
      'Complete authentication via Cursor Connect with the signed result (walletAddress, signature, timestamp).',
    ],
  };
}
