/**
 * Unit tests for credential_list_templates argument validation.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ListCredentialTemplatesArgsSchema } from '../dist/tools/list-credential-templates.js';

describe('ListCredentialTemplatesArgsSchema', () => {
  it('accepts empty object (defaults)', () => {
    const result = ListCredentialTemplatesArgsSchema.parse({});
    assert.strictEqual(result.page, 1);
    assert.strictEqual(result.size, 20);
    assert.strictEqual(result.order, 'desc');
  });

  it('accepts valid page, size, order, searchStr', () => {
    const result = ListCredentialTemplatesArgsSchema.parse({
      page: 1,
      size: 50,
      searchStr: 'trading',
      order: 'asc',
    });
    assert.strictEqual(result.page, 1);
    assert.strictEqual(result.size, 50);
    assert.strictEqual(result.searchStr, 'trading');
    assert.strictEqual(result.order, 'asc');
  });

  it('rejects page less than 1', () => {
    assert.throws(
      () => ListCredentialTemplatesArgsSchema.parse({ page: 0 }),
      (err) => err.message.includes('Number') || err.message.includes('1')
    );
  });

  it('rejects size greater than 100', () => {
    assert.throws(
      () => ListCredentialTemplatesArgsSchema.parse({ size: 101 }),
      (err) => err.message.includes('Number') || err.message.includes('100')
    );
  });
});
