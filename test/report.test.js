import test from 'node:test';
import assert from 'node:assert/strict';
import { headline, renderHtml } from '../src/report.js';

const report = {
  generatedAt: 'now',
  dryRun: false,
  mutants: [{ id: 'B1', kind: 'bug', description: 'd1' }, { id: 'R1', kind: 'refactor', description: 'd2' }],
  tests: [
    { title: 'a <b>', status: 'repaired', reason: null, cells: { clean: 'ok', B1: 'parity-caught', R1: 'false-alarm-avoided' }, pw: { clean: { passed: true }, B1: { passed: false }, R1: { passed: false } }, kane: { clean: { status: 'passed' }, B1: { status: 'failed' }, R1: { status: 'passed' } }, loop: [{ round: 1, weakOn: ['B1'], change: '- x\n+ y', after: { clean: 'ok' } }], pwLines: 20, mdLines: 8, credits: 12.34 },
    { title: 'b', status: 'needs-human', reason: 'r', cells: { clean: 'ok', B1: 'kane-weaker', R1: 'parity' }, pw: { clean: { passed: true }, B1: { passed: false }, R1: { passed: true } }, kane: { clean: { status: 'passed' }, B1: { status: 'passed' }, R1: { status: 'passed' } }, loop: [], pwLines: 10, mdLines: 6, credits: 5 },
    { title: 'c', status: 'old-test-failing', cells: { clean: 'old-test-failing', B1: 'excluded', R1: 'excluded' }, pw: { clean: { passed: false }, B1: { passed: false }, R1: { passed: false } }, kane: {}, loop: [], pwLines: 5, mdLines: 4, credits: 0 },
  ],
};

test('headline numbers', () => {
  const h = headline(report);
  assert.equal(h.testsSelected, 3);
  assert.equal(h.testsPorted, 2);
  assert.equal(h.bugCells, 2);
  assert.equal(h.bugsCaughtOld, 2);
  assert.equal(h.bugsCaughtNew, 1);
  assert.equal(h.falseAlarmsAvoided, 1);
  assert.equal(h.needsHuman, 1);
  assert.equal(h.pwLines, 35);
  assert.equal(h.mdLines, 18);
  assert.equal(h.credits, 17.3);
});

test('html is self-contained and escapes content', () => {
  const html = renderHtml({ ...report, headline: headline(report) });
  assert.doesNotMatch(html, /https?:\/\/(?!localhost)/);
  assert.match(html, /a &lt;b&gt;/);
  assert.match(html, /kane-weaker/);
  assert.match(html, /needs human: r/);
});
