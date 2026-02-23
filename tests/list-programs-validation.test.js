/**
 * Unit tests for credential_list_programs (list verification programs) argument validation.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ListVerificationProgramsArgsSchema } from '../dist/tools/list-verification-programs.js';

describe('ListVerificationProgramsArgsSchema', () => {
  it('accepts empty object (defaults)', () => {
    const result = ListVerificationProgramsArgsSchema.parse({});
    assert.strictEqual(result.page, 1);
    assert.strictEqual(result.size, 20);
    assert.strictEqual(result.sortField, 'uvpi.create_at');
    assert.strictEqual(result.order, 'desc');
  });

  it('accepts valid page, size, order', () => {
    const result = ListVerificationProgramsArgsSchema.parse({
      page: 2,
      size: 50,
      order: 'asc',
    });
    assert.strictEqual(result.page, 2);
    assert.strictEqual(result.size, 50);
    assert.strictEqual(result.order, 'asc');
  });

  it('rejects page less than 1', () => {
    assert.throws(
      () => ListVerificationProgramsArgsSchema.parse({ page: 0 }),
      (err) => err.message.includes('Number') || err.message.includes('1')
    );
  });

  it('rejects size greater than 100', () => {
    assert.throws(
      () => ListVerificationProgramsArgsSchema.parse({ size: 101 }),
      (err) => err.message.includes('Number') || err.message.includes('100')
    );
  });
});
