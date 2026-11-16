import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseList } from '../src/inventory.js';
import { parseResults } from '../src/run-playwright.js';

const fx = (n) => JSON.parse(readFileSync(fileURLToPath(new URL(`./fixtures/pw/${n}`, import.meta.url)), 'utf8'));

test('inventory: parses 24 tests from real --list JSON with id, file, title, titlePath, line', () => {
  const tests = parseList(fx('list.json'));
  assert.equal(tests.length, 24);
  const t = tests.find((x) => x.title === 'should append new items to the bottom of the list');
  assert.equal(t.line, 53);
  assert.deepEqual(t.titlePath, ['New Todo', 'should append new items to the bottom of the list']);
  assert.match(t.file, /demo-todo-app\.spec\.ts$/);
  assert.match(t.id, /^[0-9a-f]+-[0-9a-f]+$/);
  assert.equal(new Set(tests.map((x) => x.id)).size, 24);
});

test('results: clean run maps every inventory id to passed', () => {
  const tests = parseList(fx('list.json'));
  const res = parseResults(fx('clean.json'));
  assert.equal(res.size, 24);
  for (const t of tests) assert.equal(res.get(t.id)?.passed, true, t.title);
});

test('results: mutant B3 run fails exactly the counter test, with a readable error and no ANSI codes', () => {
  const tests = parseList(fx('list.json'));
  const res = parseResults(fx('b3-mutant.json'));
  const failed = tests.filter((t) => !res.get(t.id).passed);
  assert.deepEqual(failed.map((t) => t.title), ['should append new items to the bottom of the list']);
  const msg = res.get(failed[0].id).errorMessage;
  assert.match(msg, /3 items left/);
  assert.doesNotMatch(msg, /\u001b\[/);
});

import { grepPattern } from '../src/run-playwright.js';
import { quote } from '../src/util.js';

test('grepPattern leaves no shell or regex metacharacter, and still matches the title', () => {
  const title = 'a "q" & `x` $(y) %PATH% \ ^ | (z) [w] it\'s ! ; < > é';
  const p = grepPattern(title);
  assert.ok(!/["'`$%&\^|()[\]!;<>*+?{}]/.test(p), p);
  assert.ok(new RegExp(p, 'i').test(title));
  assert.equal(grepPattern('plain title-1_x'), 'plain title-1_x');
});

test('quote: POSIX uses single quotes so $(), backticks and $VAR stay literal', () => {
  assert.equal(quote('$(rm -rf x)', false), "'$(rm -rf x)'");
  assert.equal(quote("it's", false), "'it'\\''s'");
  assert.equal(quote('plain/path.ts', false), 'plain/path.ts');
  assert.equal(quote('a b', true), '"a b"');
});
