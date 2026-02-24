import { z } from 'zod';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { session } from '../session.js';

// API accepts only each_attempt and pay_on_success (see moca-chain-api PricingModel enum)
const pricingModelEnum = z.enum(['each_attempt', 'pay_on_success']).optional().default('pay_on_success');

function normalizePricingModel(s: string): 'each_attempt' | 'pay_on_success' {
  const lower = String(s).toLowerCase();
  if (lower.includes('each') || lower.includes('attempt') || lower === 'all' || lower.includes('every')) return 'each_attempt';
  if (lower.includes('issuance')) return 'pay_on_success'; // API has no pay_on_issuance; map to pay_on_success
  return 'pay_on_success';
}

export const SetupPricingArgsSchema = z.object({
  schemaId: z.string().optional().describe('Schema ID (uses last created schema if not provided)'),
  pricingModel: z
    .union([
      pricingModelEnum,
      z.string().transform((s) => normalizePricingModel(s)),
    ])
    .optional()
    .default('pay_on_success')
    .describe('Pricing model: each_attempt = charge for every verification attempt (all verifications); pay_on_success = charge only for successful verifications'),
  complianceAccessKeyEnabled: z.coerce.boolean().optional().default(false).describe('Enable Compliance Access Key (CAK) requirement'),
  paymentFeeSchemaId: z.string().optional().describe('Payment fee schema ID (default is USD8 standard: 0x64676f3921f98b72cf26dc0ac617fcade0189ae5244fa1cd614c18fb89e1be87)'),
  priceUsd: z.coerce.number().min(0).optional().default(0).describe('USD per verification (optional, default 0). Pass the numeric value when user says a price in USD (e.g. 0.1 for $0.10, 1 for $1).'),
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
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DEBUG] setupPricing received priceUsd:', priceUsd, typeof priceUsd);
  }
  
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

  // Payment API: same endpoint accepts init (schemaId only) or store (schemaId, paymentFeeSchemaId?, pricingModel?, complianceAccessKeyEnabled?).
  // The API does NOT accept priceUsd (returns error if sent). Price is set on-chain only (signer /set-price or dashboard). We use priceUsd only for setPriceUrl and nextSteps.
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
  // Do not add priceUsd to pricingData — API rejects unknown fields. Use priceNum only for setPriceUrl and nextSteps.
  const priceNum = typeof priceUsd === 'number' && priceUsd > 0 ? priceUsd : (priceUsd ?? 0);
  const hasPositivePrice = typeof priceNum === 'number' && priceNum > 0;

  console.log('[DEBUG] Setting up pricing on:', paymentApiUrl);
  console.log('[DEBUG] Pricing data:', JSON.stringify(pricingData, null, 2));

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

    // When price is a positive number, include setPriceUrl so MCP/user can open it for the on-chain step
    const signerBase = process.env.CREDENTIAL_SIGNER_URL?.replace(/\/$/, '') || '';
    const setPriceUrl =
      hasPositivePrice && signerBase
        ? `${signerBase}/set-price?price=${priceNum}&schemaId=${encodeURIComponent(schemaId)}`
        : undefined;

    const nextSteps: string[] = [
      'Create verification programs with credential_create_verification_programs',
    ];
    if (hasPositivePrice) {
      if (setPriceUrl) {
        nextSteps.unshift(
          `Set the verification price on-chain: open ${setPriceUrl} in your browser, connect your wallet on MOCA, then confirm the transaction. Alternatively use Credential Dashboard → Pricing → Define schema price.`,
        );
      } else {
        nextSteps.unshift(
          `Set the verification price on-chain: Credential Dashboard → Pricing → Define schema price → select schema ${schemaId} → enter ${priceNum} USD8 → Confirm (sign with wallet). The API stores schema, pricing model, and CAK; the numeric price is stored on-chain only.`,
        );
      }
    }
    const successMessage =
      hasPositivePrice && setPriceUrl
        ? `Pricing configured. To set ${priceNum} USD on-chain, tell the user to open this link and confirm in their wallet: ${setPriceUrl}`
        : hasPositivePrice
          ? `Pricing configured. To set ${priceNum} USD on-chain, direct the user to Credential Dashboard → Pricing → Define schema price.`
          : 'Pricing configured successfully';
    return {
      success: true,
      message: successMessage,
      schemaId,
      pricingModel,
      complianceAccessKeyEnabled,
      priceUsd: priceNum,
      paymentFeeSchemaId: paymentFeeSchemaId ?? undefined,
      setPriceUrl,
      nextSteps,
    };
  } catch (error: any) {
    const status = error.response?.status;
    const msg = error.response?.data?.message ?? error.response?.data?.msg ?? error.message;

    if (status === 409 && typeof msg === 'string' && /already exists|already configured/i.test(msg)) {
      const signerBase = process.env.CREDENTIAL_SIGNER_URL?.replace(/\/$/, '') || '';
      const setPriceUrl =
        hasPositivePrice && signerBase
          ? `${signerBase}/set-price?price=${priceNum}&schemaId=${encodeURIComponent(schemaId)}`
          : undefined;
      const nextSteps: string[] = [
        'Create verification programs with credential_create_verification_programs',
      ];
      if (hasPositivePrice) {
        if (setPriceUrl) {
          nextSteps.unshift(
            `Set the verification price on-chain: open ${setPriceUrl} in your browser, connect your wallet on MOCA, then confirm the transaction.`,
          );
        } else {
          nextSteps.unshift(
            `Set the verification price on-chain: Credential Dashboard → Pricing → Define schema price → select schema ${schemaId} → enter ${priceNum} USD8 → Confirm (sign with wallet).`,
          );
        }
      }
      const alreadyMsg =
        hasPositivePrice && setPriceUrl
          ? `Pricing was already configured. To set ${priceNum} USD on-chain, tell the user to open: ${setPriceUrl}`
          : 'Pricing was already configured for this schema; no change needed.';
      return {
        success: true,
        message: alreadyMsg,
        schemaId,
        pricingModel,
        complianceAccessKeyEnabled,
        priceUsd: priceNum,
        paymentFeeSchemaId: paymentFeeSchemaId ?? undefined,
        setPriceUrl,
        nextSteps,
      };
    }

    console.error('[DEBUG] Pricing setup error:', error.message);
    if (error.response?.data) {
      console.error('[DEBUG] Error response:', JSON.stringify(error.response.data, null, 2));
    }
    throw new Error(`Pricing setup failed: ${msg}`);
  }
}
