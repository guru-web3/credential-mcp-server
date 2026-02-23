/**
 * Unit tests for credential_setup_pricing argument validation.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SetupPricingArgsSchema } from '../dist/tools/setup-pricing.js';

describe('SetupPricingArgsSchema', () => {
  it('accepts empty object (schemaId from session, defaults)', () => {
    const result = SetupPricingArgsSchema.parse({});
    assert.strictEqual(result.schemaId, undefined);
    assert.strictEqual(result.pricingModel, 'pay_on_success');
    assert.strictEqual(result.priceUsd, 0);
    assert.strictEqual(result.complianceAccessKeyEnabled, false);
  });

  it('accepts valid pricingModel pay_on_success and pay_on_issuance', () => {
    const r1 = SetupPricingArgsSchema.parse({ pricingModel: 'pay_on_success' });
    assert.strictEqual(r1.pricingModel, 'pay_on_success');
    const r2 = SetupPricingArgsSchema.parse({ pricingModel: 'pay_on_issuance' });
    assert.strictEqual(r2.pricingModel, 'pay_on_issuance');
  });

  it('accepts schemaId and priceUsd', () => {
    const result = SetupPricingArgsSchema.parse({
      schemaId: 'scheme-1',
      priceUsd: 8.5,
    });
    assert.strictEqual(result.schemaId, 'scheme-1');
    assert.strictEqual(result.priceUsd, 8.5);
  });

  it('accepts priceUsd 0', () => {
    const result = SetupPricingArgsSchema.parse({ priceUsd: 0 });
    assert.strictEqual(result.priceUsd, 0);
  });

  it('rejects invalid pricingModel enum', () => {
    assert.throws(
      () => SetupPricingArgsSchema.parse({ pricingModel: 'pay_per_use' }),
      (err) => err.message.includes('pay_on') || err.message.includes('enum')
    );
  });

  it('rejects negative priceUsd', () => {
    assert.throws(
      () => SetupPricingArgsSchema.parse({ priceUsd: -1 }),
      (err) => err.message.includes('Number') || err.message.includes('0')
    );
  });
});
