/**
 * Unit tests for credential_authenticate argument validation (Zod schema).
 * Run after: npm run build && npm run test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AuthenticateArgsSchema } from '../dist/tools/authenticate.js';

describe('AuthenticateArgsSchema', () => {
  it('accepts valid message-signing args (walletAddress, signature, timestamp)', () => {
    const result = AuthenticateArgsSchema.parse({
      walletAddress: '0x1234567890123456789012345678901234567890',
      signature: '0xabcd',
      timestamp: Date.now(),
      environment: 'staging',
    });
    assert.strictEqual(result.walletAddress, '0x1234567890123456789012345678901234567890');
    assert.ok(result.signature);
    assert.ok(typeof result.timestamp === 'number');
  });

  it('accepts timestamp as string and coerces to number', () => {
    const ts = Date.now();
    const result = AuthenticateArgsSchema.parse({
      walletAddress: '0xab',
      signature: '0xef',
      timestamp: String(ts),
    });
    assert.strictEqual(result.timestamp, ts);
  });

  it('accepts valid credentialsJson string and merges with top-level', () => {
    const ts = Date.now();
    const result = AuthenticateArgsSchema.parse({
      credentialsJson: JSON.stringify({
        walletAddress: '0xwallet',
        signature: '0xsig',
        timestamp: ts,
      }),
      environment: 'staging',
    });
    assert.strictEqual(result.walletAddress, '0xwallet');
    assert.strictEqual(result.signature, '0xsig');
    assert.strictEqual(result.timestamp, ts);
  });

  it('rejects when neither privateKey nor message-signing triple is provided', () => {
    const orig = process.env.CREDENTIAL_MCP_PRIVATE_KEY;
    delete process.env.CREDENTIAL_MCP_PRIVATE_KEY;
    try {
      assert.throws(
        () =>
          AuthenticateArgsSchema.parse({
            environment: 'staging',
          }),
        (err) => err.message.includes('Provide either privateKey') || err.message.includes('message-signing')
      );
    } finally {
      if (orig !== undefined) process.env.CREDENTIAL_MCP_PRIVATE_KEY = orig;
    }
  });

  it('rejects when both privateKey and message-signing triple are provided', () => {
    assert.throws(
      () =>
        AuthenticateArgsSchema.parse({
          privateKey: 'a'.repeat(64),
          walletAddress: '0xab',
          signature: '0xcd',
          timestamp: Date.now(),
        }),
      (err) => err.message.includes('Provide either privateKey') || err.message.includes('message-signing')
    );
  });

  it('accepts privateKey only when no message-signing fields', () => {
    const result = AuthenticateArgsSchema.parse({
      privateKey: 'a'.repeat(64),
      environment: 'staging',
    });
    assert.strictEqual(result.privateKey, 'a'.repeat(64));
    assert.strictEqual(result.environment, 'staging');
  });

  it('accepts single JSON string as full args', () => {
    const ts = Date.now();
    const json = JSON.stringify({
      walletAddress: '0xaa',
      signature: '0xbb',
      timestamp: ts,
      environment: 'production',
    });
    const result = AuthenticateArgsSchema.parse(json);
    assert.strictEqual(result.walletAddress, '0xaa');
    assert.strictEqual(result.timestamp, ts);
    assert.strictEqual(result.environment, 'production');
  });
});
