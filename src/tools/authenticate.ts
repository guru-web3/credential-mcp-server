import { z } from 'zod';
import { Wallet } from 'ethers';
import CryptoJS from 'crypto-js';
import axios from 'axios';
import { session } from '../session.js';

export const AuthenticateArgsSchema = z.object({
  privateKey: z.string().describe('Ethereum wallet private key (64 hex characters, with or without 0x prefix)'),
  environment: z.enum(['staging', 'production']).default('staging').describe('API environment'),
});

/**
 * Generate custom headers for API requests (required by backend)
 */
function generateHeaders(body: any, timestamp: number): Record<string, string> {
  const bodyStr = JSON.stringify(body);
  const hash = CryptoJS.SHA256(bodyStr).toString();
  
  return {
    'x-signature': hash,
    'x-timestamp': timestamp.toString(),
    'x-appversion': 'zkserapi_1.0.0',
    'Content-Type': 'application/json',
  };
}

export async function authenticate(args: z.infer<typeof AuthenticateArgsSchema>) {
  const { privateKey, environment } = args;

  // Set API URL based on environment
  const apiUrl = environment === 'production'
    ? 'https://credential.api.air3.com'
    : 'https://credential.api.staging.air3.com';
  
  session.setEnvironment(environment);

  try {
    // Get wallet from private key
    const pk = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    const wallet = new Wallet(pk);
    const walletAddress = wallet.address.toLowerCase();

    console.log(`[DEBUG] Wallet address: ${walletAddress}`);

    // Create timestamp
    const date = new Date();
    const timestamp = date.getTime();
    const isoTimestamp = date.toISOString();

    // Build message to sign (exact format required by backend)
    const message = `You are logging into AIR Credential Dashboard with your wallet: ${walletAddress}
Signature approval is required and will not cost any fees.
Timestamp: ${isoTimestamp}`;

    console.log(`[DEBUG] Signing message...`);
    
    // Sign the message using Ethereum personal_sign
    const signature = await wallet.signMessage(message);

    console.log(`[DEBUG] Signature: ${signature.substring(0, 20)}...`);

    // Prepare login request body
    const loginBody = {
      walletAddress,
      signature,
      timestamp,
    };

    // Generate required headers
    const headers = generateHeaders(loginBody, timestamp);

    console.log(`[DEBUG] Calling ${apiUrl}/partner/login`);

    // Call partner login API
    const loginResponse = await axios.post(
      `${apiUrl}/partner/login`,
      loginBody,
      { headers }
    );

    console.log('[DEBUG] Login response:', loginResponse.status);
    console.log('[DEBUG] Login data:', JSON.stringify(loginResponse.data, null, 2));

    // API returns code 80000000 for success
    if (!loginResponse.data || loginResponse.data.code !== 80000000) {
      throw new Error(`Login failed: ${loginResponse.data?.msg || 'Unknown error'}`);
    }

    const { dashboardToken, issuerId, issuerDid, partnerId, verifierId, verifierDid } = loginResponse.data.data;

    // Store session data
    session.set('dashboardToken', dashboardToken);
    session.set('issuerId', issuerId);
    session.set('issuerDid', issuerDid);
    session.set('partnerId', partnerId);
    session.set('verifierId', verifierId);
    session.set('verifierDid', verifierDid);
    session.set('walletAddress', walletAddress);

    console.log(`[DEBUG] ✅ Authentication successful! Partner ID: ${partnerId}`);

    return {
      success: true,
      message: 'Authentication successful',
      partnerId,
      issuerId,
      issuerDid,
      verifierId,
      verifierDid,
      walletAddress,
      environment,
      nextSteps: [
        'Use credential_create_schema to create a credential schema',
        'Use credential_setup_pricing to configure pricing',
        'Use credential_create_verification_programs to create verification programs',
      ],
    };
  } catch (error: any) {
    console.error('[DEBUG] ❌ Authentication error:', error.message);
    if (error.response) {
      console.error('[DEBUG] Response status:', error.response.status);
      console.error('[DEBUG] Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw new Error(
      `Authentication failed: ${error.response?.data?.msg || error.message}`
    );
  }
}
