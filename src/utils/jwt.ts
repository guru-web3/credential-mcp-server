import * as jose from 'jose';

/**
 * Generate JWT token for partner authentication using Ethereum private key (secp256k1)
 */
export async function generatePartnerJWT(privateKeyPem: string, partnerId?: string): Promise<string> {
  try {
    // Import Ethereum private key (secp256k1 curve)
    const privateKey = await jose.importPKCS8(privateKeyPem, 'ES256K');

    const jwt = await new jose.SignJWT({
      partnerId: partnerId || 'partner',
    })
      .setProtectedHeader({ alg: 'ES256K' })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(privateKey);

    return jwt;
  } catch (error: any) {
    throw new Error(`Failed to generate JWT: ${error.message}`);
  }
}
