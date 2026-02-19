import { z } from 'zod';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { session } from '../session.js';

export const SetupPricingArgsSchema = z.object({
  schemaId: z.string().optional().describe('Schema ID (uses last created schema if not provided)'),
  pricingModel: z.enum(['pay_on_success', 'pay_on_issuance']).optional().default('pay_on_success').describe('Pricing model: pay_on_success (only charged for successful verifications) or pay_on_issuance'),
  complianceAccessKeyEnabled: z.boolean().optional().default(false).describe('Enable Compliance Access Key (CAK) requirement'),
  paymentFeeSchemaId: z.string().optional().describe('Payment fee schema ID (default is USD8 standard: 0x64676f3921f98b72cf26dc0ac617fcade0189ae5244fa1cd614c18fb89e1be87)'),
  priceUsd: z.number().min(0).optional().default(0).describe('USD per verification (optional, default 0). Verification fee in USD.'),
});

/**
 * Generate headers for payment API.
 * Signature must match dashboard: SHA256(body) -> digest_ts -> AES-ECB -> SHA256(ciphertext WordArray).
 * Do not use SHA256(encrypted.toString()) - dashboard hashes raw ciphertext.
 */
function generatePaymentHeaders(body: any, dashboardToken: string, issuerId: string): Record<string, string> {
  const timestamp = Date.now().toString();
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);

  // Step 1: SHA256 hash of body (dashboard: hasher.update(enc.Utf8.parse(content)))
  const firstHash = CryptoJS.SHA256(CryptoJS.enc.Utf8.parse(bodyStr)).toString();

  // Step 2: Combine with timestamp (dashboard: firstStepDigest + '_' + timestamp)
  const combined = `${firstHash}_${timestamp}`;

  // Step 3: AES-ECB encryption (dashboard: encryptWithEbc(secondStepStr))
  const key = CryptoJS.enc.Utf8.parse('WpVog9P8NveQLEJYE2cnjg==');
  const encrypted = CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(combined),
    key,
    { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
  );

  // Step 4: SHA256 of ciphertext WordArray (dashboard: hasher2.update(thirdStepResults.ciphertext))
  const signature = CryptoJS.SHA256(encrypted.ciphertext).toString();

  return {
    'accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'x-signature': signature,
    'x-timestamp': timestamp,
    'x-appversion': 'zkserapi_1.0.0',
    'x-dashboard-auth': dashboardToken,
    'x-issuer-id': issuerId,
  };
}

export async function setupPricing(args: z.infer<typeof SetupPricingArgsSchema>) {
  session.requireAuth();

  const { schemaId: providedSchemaId, pricingModel, complianceAccessKeyEnabled, paymentFeeSchemaId, priceUsd } = args;
  
  const schemaId = providedSchemaId || session.get('schemaId');
  if (!schemaId) {
    throw new Error('No schema ID provided. Create a schema first or provide schemaId parameter.');
  }

  const dashboardToken = session.get('dashboardToken');
  const issuerId = session.get('issuerId');
  const environment = session.get('environment');

  if (!dashboardToken || !issuerId) {
    throw new Error('Missing authentication tokens. Please authenticate first.');
  }

  // Payment API: same endpoint accepts init (schemaId only) or store (all four). Do not send priceUsd or default paymentFeeSchemaId.
  const paymentApiUrl = environment === 'production'
    ? 'https://api.mocachain.org'
    : 'https://api.staging.mocachain.org';

  const pricingData: Record<string, unknown> = {
    schemaId,
    pricingModel,
    complianceAccessKeyEnabled,
  };
  if (paymentFeeSchemaId != null && paymentFeeSchemaId !== '') {
    pricingData.paymentFeeSchemaId = paymentFeeSchemaId;
  }

  console.log('[DEBUG] Setting up pricing on:', paymentApiUrl);
  console.log('[DEBUG] Pricing data:', JSON.stringify(pricingData, null, 2));
  if ((priceUsd ?? 0) !== 0) {
    console.log('[DEBUG] priceUsd is for display only; payment API does not accept it yet.');
  }

  try {
    const headers = generatePaymentHeaders(pricingData as any, dashboardToken, issuerId);
    
    const response = await axios.post(
      `${paymentApiUrl}/v1/payment/schema/fee`,
      pricingData,
      { headers }
    );

    console.log('[DEBUG] Pricing response:', response.status);

    // Payment API uses standard HTTP status codes (200/201), not code field
    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`API returned error: ${response.data?.msg || response.statusText}`);
    }

    return {
      success: true,
      message: 'Pricing configured successfully',
      schemaId,
      pricingModel,
      complianceAccessKeyEnabled,
      priceUsd: priceUsd ?? 0,
      paymentFeeSchemaId: paymentFeeSchemaId ?? undefined,
      nextSteps: [
        'Create verification programs with credential_create_verification_programs',
      ],
    };
  } catch (error: any) {
    console.error('[DEBUG] Pricing setup error:', error.message);
    if (error.response?.data) {
      console.error('[DEBUG] Error response:', JSON.stringify(error.response.data, null, 2));
    }
    throw new Error(`Pricing setup failed: ${error.response?.data?.msg || error.message}`);
  }
}
