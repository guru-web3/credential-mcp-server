/**
 * Unit tests for credential_create_verification_programs argument validation.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CreateProgramsArgsSchema } from '../dist/tools/create-programs.js';

const validProgram = {
  programName: 'tier_gold',
  conditions: [
    { attribute: 'totalVolume', operator: '>=', value: 1000 },
    { attribute: 'platform', operator: '=', value: 'ethereum' },
  ],
};

describe('CreateProgramsArgsSchema', () => {
  it('accepts valid programs array with conditions', () => {
    const result = CreateProgramsArgsSchema.parse({
      programs: [validProgram],
      deploy: true,
    });
    assert.strictEqual(result.programs.length, 1);
    assert.strictEqual(result.programs[0].programName, 'tier_gold');
    assert.strictEqual(result.programs[0].conditions.length, 2);
    assert.strictEqual(result.deploy, true);
  });

  it('defaults deploy to true', () => {
    const result = CreateProgramsArgsSchema.parse({ programs: [validProgram] });
    assert.strictEqual(result.deploy, true);
  });

  it('accepts optional schemaId', () => {
    const result = CreateProgramsArgsSchema.parse({
      schemaId: 'scheme-1',
      programs: [validProgram],
    });
    assert.strictEqual(result.schemaId, 'scheme-1');
  });

  it('accepts all operator enums', () => {
    const ops = ['>', '>=', '<', '<=', '=', '!='];
    for (const op of ops) {
      const result = CreateProgramsArgsSchema.parse({
        programs: [{ programName: 'p1', conditions: [{ attribute: 'a', operator: op, value: 1 }] }],
      });
      assert.strictEqual(result.programs[0].conditions[0].operator, op);
    }
  });

  it('accepts value as string, number, boolean', () => {
    const result = CreateProgramsArgsSchema.parse({
      programs: [
        { programName: 'p1', conditions: [{ attribute: 'x', operator: '=', value: 'yes' }] },
        { programName: 'p2', conditions: [{ attribute: 'n', operator: '>=', value: 42 }] },
        { programName: 'p3', conditions: [{ attribute: 'b', operator: '=', value: true }] },
      ],
    });
    assert.strictEqual(result.programs[0].conditions[0].value, 'yes');
    assert.strictEqual(result.programs[1].conditions[0].value, 42);
    assert.strictEqual(result.programs[2].conditions[0].value, true);
  });

  it('rejects invalid operator', () => {
    assert.throws(
      () =>
        CreateProgramsArgsSchema.parse({
          programs: [{ programName: 'p1', conditions: [{ attribute: 'a', operator: '~=', value: 1 }] }],
        }),
      (err) => err.message.includes('enum') || err.message.includes('operator')
    );
  });

  it('rejects empty programs array', () => {
    assert.throws(
      () => CreateProgramsArgsSchema.parse({ programs: [] }),
      (err) => err.message.includes('array') || err.message.includes('programs')
    );
  });

  it('rejects program without programName', () => {
    assert.throws(
      () =>
        CreateProgramsArgsSchema.parse({
          programs: [{ conditions: [{ attribute: 'a', operator: '=', value: 1 }] }],
        }),
      (err) => err.message.includes('programName') || err.message.includes('required')
    );
  });

  it('rejects program without conditions', () => {
    assert.throws(
      () =>
        CreateProgramsArgsSchema.parse({
          programs: [{ programName: 'p1', conditions: [] }],
        }),
      (err) => err.message.includes('array') || err.message.includes('conditions')
    );
  });
});
