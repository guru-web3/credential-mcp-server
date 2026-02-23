/**
 * Unit tests for credential_template_info argument validation (appType required, branch optional).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TemplateInfoArgsSchema } from '../dist/tools/template-info.js';

describe('TemplateInfoArgsSchema', () => {
  it('accepts appType issuance only', () => {
    const result = TemplateInfoArgsSchema.parse({ appType: 'issuance' });
    assert.strictEqual(result.appType, 'issuance');
    assert.strictEqual(result.branch, undefined);
  });

  it('accepts appType verifier only', () => {
    const result = TemplateInfoArgsSchema.parse({ appType: 'verifier' });
    assert.strictEqual(result.appType, 'verifier');
  });

  it('accepts appType and optional branch', () => {
    const result = TemplateInfoArgsSchema.parse({ appType: 'issuance', branch: 'sample/passport-age' });
    assert.strictEqual(result.appType, 'issuance');
    assert.strictEqual(result.branch, 'sample/passport-age');
  });

  it('rejects missing appType', () => {
    assert.throws(
      () => TemplateInfoArgsSchema.parse({}),
      (err) => err.message.includes('appType') || err.message.includes('required')
    );
  });

  it('rejects invalid appType enum', () => {
    assert.throws(
      () => TemplateInfoArgsSchema.parse({ appType: 'dashboard' }),
      (err) => err.message.includes('enum') || err.message.includes('issuance')
    );
  });
});
