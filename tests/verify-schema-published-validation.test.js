/**
 * Unit tests for credential_verify_schema_published argument validation.
 * Requires auth and schemaId (or session schemaId) at runtime; here we test schema parse only.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { VerifySchemaPublishedArgsSchema } from '../dist/tools/verify-schema-published.js';

describe('VerifySchemaPublishedArgsSchema', () => {
  it('accepts empty object (schemaId optional, uses session)', () => {
    const result = VerifySchemaPublishedArgsSchema.parse({});
    assert.strictEqual(result.schemaId, undefined);
  });

  it('accepts schemaId string', () => {
    const result = VerifySchemaPublishedArgsSchema.parse({ schemaId: 'scheme-123' });
    assert.strictEqual(result.schemaId, 'scheme-123');
  });

  it('accepts schemaId with full format', () => {
    const id = 'did:air:id:test:4P62pyrH8vA2izZoEJNETZ7fvSFr2feZZJQCnaaUxv';
    const result = VerifySchemaPublishedArgsSchema.parse({ schemaId: id });
    assert.strictEqual(result.schemaId, id);
  });
});
