/**
 * Unit tests for credential_create_schema argument validation (Zod schema).
 * Aligned with credential-dashboard define-schema-form rules (schemaType alphanumeric, not numbers only; version format).
 * Run after: npm run build && npm run test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CreateSchemaArgsSchema } from '../dist/tools/create-schema.js';

const validDataPoints = [
  { name: 'totalVolume', type: 'integer', description: 'Total volume' },
  { name: 'platform', type: 'string' },
];

describe('CreateSchemaArgsSchema', () => {
  it('accepts valid schema with all required fields', () => {
    const result = CreateSchemaArgsSchema.parse({
      schemaName: 'Trading Volume',
      schemaType: 'TradingVolumeCredential',
      dataPoints: validDataPoints,
      version: '1.0',
    });
    assert.strictEqual(result.schemaName, 'Trading Volume');
    assert.strictEqual(result.schemaType, 'TradingVolumeCredential');
    assert.strictEqual(result.version, '1.0');
    assert.strictEqual(result.dataPoints.length, 2);
  });

  it('accepts schema with optional description', () => {
    const result = CreateSchemaArgsSchema.parse({
      schemaName: 'Test',
      schemaType: 'TestSchema',
      dataPoints: [{ name: 'x', type: 'string' }],
      description: 'Optional desc',
      version: '1.0.1',
    });
    assert.strictEqual(result.description, 'Optional desc');
    assert.strictEqual(result.version, '1.0.1');
  });

  it('defaults version to 1.0 when omitted', () => {
    const result = CreateSchemaArgsSchema.parse({
      schemaName: 'Test',
      schemaType: 'TestSchema',
      dataPoints: [{ name: 'a', type: 'boolean' }],
    });
    assert.strictEqual(result.version, '1.0');
  });

  it('rejects empty schemaName', () => {
    assert.throws(
      () =>
        CreateSchemaArgsSchema.parse({
          schemaName: '',
          schemaType: 'Abc',
          dataPoints: validDataPoints,
          version: '1.0',
        }),
      (err) => err.message.includes('Schema name') || err.message.includes('required')
    );
  });

  it('rejects empty schemaType', () => {
    assert.throws(
      () =>
        CreateSchemaArgsSchema.parse({
          schemaName: 'Title',
          schemaType: '',
          dataPoints: validDataPoints,
          version: '1.0',
        }),
      (err) => err.message.includes('Schema type') || err.message.includes('required')
    );
  });

  it('rejects schemaType that is numbers only', () => {
    assert.throws(
      () =>
        CreateSchemaArgsSchema.parse({
          schemaName: 'Title',
          schemaType: '12345',
          dataPoints: validDataPoints,
          version: '1.0',
        }),
      (err) => err.message.includes('numbers only') || err.message.includes('schemaType')
    );
  });

  it('rejects schemaType with spaces or special chars', () => {
    assert.throws(
      () =>
        CreateSchemaArgsSchema.parse({
          schemaName: 'Title',
          schemaType: 'My Schema Type',
          dataPoints: validDataPoints,
          version: '1.0',
        }),
      (err) => err.message.includes('alphanumeric') || err.message.includes('schemaType')
    );
  });

  it('rejects invalid version format', () => {
    assert.throws(
      () =>
        CreateSchemaArgsSchema.parse({
          schemaName: 'Title',
          schemaType: 'ValidType',
          dataPoints: validDataPoints,
          version: 'v1.0',
        }),
      (err) => err.message.includes('Version') || err.message.includes('version')
    );
  });

  it('rejects empty dataPoints', () => {
    assert.throws(
      () =>
        CreateSchemaArgsSchema.parse({
          schemaName: 'Title',
          schemaType: 'ValidType',
          dataPoints: [],
          version: '1.0',
        }),
      (err) => err.message.includes('At least one') || err.message.includes('data point')
    );
  });

  it('accepts schemaType with mixed letters and numbers', () => {
    const result = CreateSchemaArgsSchema.parse({
      schemaName: 'Test',
      schemaType: 'TradingVolume2024',
      dataPoints: validDataPoints,
      version: '1.0',
    });
    assert.strictEqual(result.schemaType, 'TradingVolume2024');
  });

  it('accepts version 1.0.1', () => {
    const result = CreateSchemaArgsSchema.parse({
      schemaName: 'Test',
      schemaType: 'TestSchema',
      dataPoints: validDataPoints,
      version: '1.0.1',
    });
    assert.strictEqual(result.version, '1.0.1');
  });
});
