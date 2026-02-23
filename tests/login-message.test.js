/**
 * Unit tests for get-login-challenge buildLoginMessage (must match credential-api SignatureCheckHelperImpl).
 * Run after: npm run build && npm run test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildLoginMessage } from '../dist/tools/get-login-challenge.js';

const EXPECTED_PREFIX = 'You are logging into AIR Credential Dashboard with your wallet: ';
const EXPECTED_MID = '\nSignature approval is required and will not cost any fees.\nTimestamp: ';

describe('buildLoginMessage', () => {
  it('produces message with lowercase wallet address', () => {
    const msg = buildLoginMessage('0xAbCdEf1234567890AbCdEf1234567890AbCdEf12', '2025-02-19T12:00:00.000Z');
    assert.ok(msg.startsWith(EXPECTED_PREFIX));
    assert.ok(msg.includes('0xabcdef1234567890abcdef1234567890abcdef12'));
  });

  it('includes exact wording required by backend', () => {
    const msg = buildLoginMessage('0xaa', '2025-02-19T12:00:00.000Z');
    assert.ok(msg.includes('You are logging into AIR Credential Dashboard with your wallet:'));
    assert.ok(msg.includes('Signature approval is required and will not cost any fees.'));
    assert.ok(msg.includes('Timestamp: 2025-02-19T12:00:00.000Z'));
  });

  it('uses ISO timestamp in body (not raw ms)', () => {
    const iso = '2025-03-01T08:30:00.000Z';
    const msg = buildLoginMessage('0xwallet', iso);
    assert.strictEqual(msg.trim().endsWith(iso), true);
  });

  it('matches credential-api SignatureCheckHelperImpl format', () => {
    const addr = '0x6ddce4bd197a0f6fbda0fc833a7490c152151b62';
    const isoTimestamp = '2025-02-19T12:31:39.434Z';
    const msg = buildLoginMessage(addr, isoTimestamp);
    const expected =
      'You are logging into AIR Credential Dashboard with your wallet: 0x6ddce4bd197a0f6fbda0fc833a7490c152151b62\n' +
      'Signature approval is required and will not cost any fees.\n' +
      'Timestamp: 2025-02-19T12:31:39.434Z';
    assert.strictEqual(msg, expected);
  });
});
