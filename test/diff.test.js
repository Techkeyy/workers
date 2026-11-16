import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unifiedDiff } from '../src/diff.js';

test('identical texts give an empty diff', () => assert.equal(unifiedDiff('a\nb', 'a\nb'), ''));

test('change with context', () => assert.equal(unifiedDiff('a\nb\nc', 'a\nB\nc'), ' a\n-b\n+B\n c'));

test('long unchanged runs collapse to an ellipsis, 2 context lines kept', () => {
  const a = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const b = [...a];
  b[4] = 'X';
  assert.equal(unifiedDiff(a.join('\n'), b.join('\n')), '…\n 3\n 4\n-5\n+X\n 6\n 7\n…');
});

test('repeated lines: every changed line is reported (round 2 bug)', () => {
  const r1 = ['# t', '', '## Verify the visible todo count', '', 'Verify visible text "3 items left" is shown on the page.', '', '## Verify the item order and persistence', '', 'Reload the page. Verify the list shows exactly these items.'].join('\n');
  const r2 = ['# t', '', '## Verify the todo count and item order', '', 'Verify the list shows exactly these items.', '', '## Verify the items persist after reloading', '', 'Reload the page.'].join('\n');
  const d = unifiedDiff(r1, r2).split('\n');
  for (const l of ['-Verify visible text "3 items left" is shown on the page.', '+Verify the list shows exactly these items.', '-Reload the page. Verify the list shows exactly these items.', '+Reload the page.', '-## Verify the visible todo count', '+## Verify the todo count and item order']) assert.ok(d.includes(l), l);
  assert.ok(d.includes(' # t'));
});

test('pure additions and removals', () => {
  assert.equal(unifiedDiff('a', 'a\nb'), ' a\n+b');
  assert.equal(unifiedDiff('a\nb', 'a'), ' a\n-b');
});
