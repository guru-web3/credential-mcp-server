/**
 * Unit tests for credential_list_schemas argument validation.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ListSchemasArgsSchema } from '../dist/tools/list-schemas.js';

describe('ListSchemasArgsSchema', () => {
  it('accepts empty object (defaults)', () => {
    const result = ListSchemasArgsSchema.parse({});
    assert.strictEqual(result.page, 1);
    assert.strictEqual(result.size, 20);
    assert.strictEqual(result.filterType, 'own_schemas');
    assert.strictEqual(result.order, 'desc');
  });

  it('accepts valid page, size, filterType, order', () => {
    const result = ListSchemasArgsSchema.parse({
      page: 2,
      size: 50,
      filterType: 'other_schemas',
      searchStr: 'trading',
      order: 'asc',
    });
    assert.strictEqual(result.page, 2);
    assert.strictEqual(result.size, 50);
    assert.strictEqual(result.filterType, 'other_schemas');
    assert.strictEqual(result.searchStr, 'trading');
    assert.strictEqual(result.order, 'asc');
  });

  it('rejects page less than 1', () => {
    assert.throws(
      () => ListSchemasArgsSchema.parse({ page: 0 }),
      (err) => err.message.includes('Number') || err.message.includes('1')
    );
  });

  it('rejects size greater than 100', () => {
    assert.throws(
      () => ListSchemasArgsSchema.parse({ size: 101 }),
      (err) => err.message.includes('Number') || err.message.includes('100')
    );
  });

  it('normalizes invalid filterType to default (own_schemas)', () => {
    const result = ListSchemasArgsSchema.parse({ filterType: 'all' });
    assert.strictEqual(result.filterType, 'own_schemas');
  });
});
