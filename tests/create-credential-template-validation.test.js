/**
 * Unit tests for credential_create_program (create-credential-template) argument validation.
 * Covers valid args, optional fields, invalid (e.g. negative expiration).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CreateCredentialTemplateArgsSchema } from '../dist/tools/create-credential-template.js';

describe('CreateCredentialTemplateArgsSchema', () => {
  it('accepts minimal valid args with schemaId', () => {
    const result = CreateCredentialTemplateArgsSchema.parse({ schemaId: 'scheme-1' });
    assert.strictEqual(result.schemaId, 'scheme-1');
    assert.strictEqual(result.expirationDuration, 365);
    assert.strictEqual(result.issueMax, null);
    assert.strictEqual(result.accessibleStartAt, '');
    assert.strictEqual(result.accessibleEndAt, '');
  });

  it('defaults expirationDuration to 365', () => {
    const result = CreateCredentialTemplateArgsSchema.parse({ schemaId: 'x' });
    assert.strictEqual(result.expirationDuration, 365);
  });

  it('accepts optional expirationDuration, issueMax, accessibleEndAt', () => {
    const result = CreateCredentialTemplateArgsSchema.parse({
      schemaId: 's1',
      expirationDuration: 180,
      issueMax: 1000,
      accessibleStartAt: '2025-01-01T00:00:00Z',
      accessibleEndAt: '2025-12-31T23:59:59Z',
    });
    assert.strictEqual(result.expirationDuration, 180);
    assert.strictEqual(result.issueMax, 1000);
    assert.strictEqual(result.accessibleStartAt, '2025-01-01T00:00:00Z');
    assert.strictEqual(result.accessibleEndAt, '2025-12-31T23:59:59Z');
  });

  it('accepts null issueMax for unlimited', () => {
    const result = CreateCredentialTemplateArgsSchema.parse({ schemaId: 's1', issueMax: null });
    assert.strictEqual(result.issueMax, null);
  });

  it('rejects negative expirationDuration', () => {
    assert.throws(
      () =>
        CreateCredentialTemplateArgsSchema.parse({
          schemaId: 's1',
          expirationDuration: -1,
        }),
      (err) => err.message.includes('Number') || err.message.includes('expiration')
    );
  });

  it('rejects zero expirationDuration', () => {
    assert.throws(
      () => CreateCredentialTemplateArgsSchema.parse({ schemaId: 's1', expirationDuration: 0 }),
      (err) => err.message.includes('Number') || err.message.includes('1')
    );
  });

  it('rejects when accessibleEndAt is before or equal to accessibleStartAt', () => {
    assert.throws(
      () =>
        CreateCredentialTemplateArgsSchema.parse({
          schemaId: 's1',
          accessibleStartAt: '2025-12-31T00:00:00Z',
          accessibleEndAt: '2025-01-01T00:00:00Z',
        }),
      (err) => err.message.includes('accessibleEndAt') || err.message.includes('after')
    );
    assert.throws(
      () =>
        CreateCredentialTemplateArgsSchema.parse({
          schemaId: 's1',
          accessibleStartAt: '2025-06-01T00:00:00Z',
          accessibleEndAt: '2025-06-01T00:00:00Z',
        }),
      (err) => err.message.includes('accessibleEndAt') || err.message.includes('after')
    );
  });

  it('accepts when accessibleEndAt is after accessibleStartAt', () => {
    const result = CreateCredentialTemplateArgsSchema.parse({
      schemaId: 's1',
      accessibleStartAt: '2025-01-01T00:00:00Z',
      accessibleEndAt: '2025-12-31T23:59:59Z',
    });
    assert.strictEqual(result.accessibleStartAt, '2025-01-01T00:00:00Z');
    assert.strictEqual(result.accessibleEndAt, '2025-12-31T23:59:59Z');
  });
});
