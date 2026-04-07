/**
 * Quick E2E test for the x402_pay_and_call MCP tool.
 * Simulates what happens when an AI agent calls the tool via MCP.
 *
 * Prerequisites: x402 server running on port 4402 (npm run server in x402-moca-contracts)
 */
import 'dotenv/config';
import { x402PayAndVerify } from '../src/tools/x402-pay-and-verify.js';

async function main() {
  console.log('=== MCP x402_pay_and_call Tool E2E Test ===\n');

  console.log('--- Test 1: Credential Verify ($0.01) ---');
  const result1 = await x402PayAndVerify({
    url: 'http://localhost:4402/api/credential/verify',
    method: 'GET',
  });
  console.log(JSON.stringify(result1, null, 2));

  console.log('\n--- Test 2: Identity Status ($0.005) ---');
  const result2 = await x402PayAndVerify({
    url: 'http://localhost:4402/api/identity/status',
    method: 'GET',
  });
  console.log(JSON.stringify(result2, null, 2));

  console.log('\n--- Test 3: Non-paid endpoint (should passthrough) ---');
  const result3 = await x402PayAndVerify({
    url: 'http://localhost:4402/health',
    method: 'GET',
  });
  console.log(JSON.stringify(result3, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
