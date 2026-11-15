import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, computeCells, needsRepair } from '../src/parity.js';

const rows = [
  // [column, pwPassed, kane, expected]
  ['clean', true, 'passed', 'ok'],
  ['clean', true, 'failed', 'broken-on-clean'],
  ['clean', false, 'passed', 'old-test-failing'],
  ['clean', false, 'failed', 'old-test-failing'],
  ['bug', false, 'failed', 'parity-caught'],
  ['bug', true, 'passed', 'parity-missed'],
  ['bug', false, 'passed', 'kane-weaker'],
  ['bug', true, 'failed', 'kane-stronger'],
  ['refactor', false, 'passed', 'false-alarm-avoided'],
  ['refactor', true, 'passed', 'parity'],
  ['refactor', true, 'failed', 'kane-false-alarm'],
  ['refactor', false, 'failed', 'kane-false-alarm'],
  ['clean', true, 'error', 'error'],
  ['bug', false, 'error', 'error'],
  ['refactor', true, 'error', 'error'],
  ['bug', false, undefined, 'pw-only'],
];

for (const [col, pw, kane, want] of rows) {
  test(`parity ${col} pw=${pw ? 'pass' : 'fail'} kane=${kane} -> ${want}`, () => {
    assert.equal(classify(col, pw, kane), want);
  });
}

test('computeCells builds a column per mutant and skips Kane mutant runs when clean is not ok', () => {
  const mutants = [{ id: 'B1', kind: 'bug' }, { id: 'R1', kind: 'refactor' }];
  const pw = { clean: { passed: true }, B1: { passed: false }, R1: { passed: false } };
  const ok = computeCells(mutants, pw, { clean: { status: 'passed' }, B1: { status: 'passed' }, R1: { status: 'passed' } });
  assert.deepEqual(ok, { clean: 'ok', B1: 'kane-weaker', R1: 'false-alarm-avoided' });
  const broken = computeCells(mutants, pw, { clean: { status: 'failed' } });
  assert.equal(broken.clean, 'broken-on-clean');
  assert.equal(broken.B1, 'pw-only');
  const old = computeCells(mutants, { ...pw, clean: { passed: false } }, { clean: { status: 'passed' } });
  assert.deepEqual(old, { clean: 'old-test-failing', B1: 'excluded', R1: 'excluded' });
});

test('needsRepair is true for kane-weaker or broken-on-clean only', () => {
  assert.equal(needsRepair({ clean: 'ok', B1: 'kane-weaker' }), true);
  assert.equal(needsRepair({ clean: 'broken-on-clean' }), true);
  assert.equal(needsRepair({ clean: 'ok', B1: 'parity-caught', R1: 'kane-false-alarm', B2: 'parity-missed' }), false);
});
