/**
 * Unit tests for credential_docs argument validation (flow enum).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CredentialDocsArgsSchema } from '../dist/tools/credential-docs.js';

describe('CredentialDocsArgsSchema', () => {
  it('defaults flow to both when omitted', () => {
    const result = CredentialDocsArgsSchema.parse({});
    assert.strictEqual(result.flow, 'both');
  });

  it('accepts flow issuance', () => {
    const result = CredentialDocsArgsSchema.parse({ flow: 'issuance' });
    assert.strictEqual(result.flow, 'issuance');
  });

  it('accepts flow verification', () => {
    const result = CredentialDocsArgsSchema.parse({ flow: 'verification' });
    assert.strictEqual(result.flow, 'verification');
  });

  it('accepts flow both', () => {
    const result = CredentialDocsArgsSchema.parse({ flow: 'both' });
    assert.strictEqual(result.flow, 'both');
  });

  it('rejects invalid flow enum', () => {
    assert.throws(
      () => CredentialDocsArgsSchema.parse({ flow: 'docs' }),
      (err) => err.message.includes('enum') || err.message.includes('issuance')
    );
  });
});
