import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cacheDir, restoreCache, snapshotCache, snapshotDir, withRestoredCache } from '../src/kane-cache.js';

function setup() {
  const root = mkdtempSync(join(tmpdir(), 'kane-cache-'));
  const md = join(root, 'tests', '01-x', '01-x_test.md');
  const cache = join(root, 'tests', '01-x', 'output-01-x');
  mkdirSync(join(cache, '.internal', 'steps'), { recursive: true });
  writeFileSync(join(cache, '.internal', 'execution.json'), 'clean');
  writeFileSync(join(cache, '.internal', 'steps', 's1.json'), 'step');
  return { root, md, cache };
}

test('paths: cache next to the md, snapshot under <out>/.snapshots/<stem>', () => {
  const { root, md, cache } = setup();
  assert.equal(cacheDir(md), cache);
  assert.equal(snapshotDir(root, md), join(root, '.snapshots', '01-x'));
  rmSync(root, { recursive: true, force: true });
});

test('snapshot then restore undoes edits, additions and deletions', () => {
  const { root, md, cache } = setup();
  assert.equal(snapshotCache(md, root), true);
  writeFileSync(join(cache, '.internal', 'execution.json'), 'HEALED');
  writeFileSync(join(cache, '.internal', 'extra.json'), 'new');
  rmSync(join(cache, '.internal', 'steps'), { recursive: true });
  restoreCache(md, root);
  assert.equal(readFileSync(join(cache, '.internal', 'execution.json'), 'utf8'), 'clean');
  assert.equal(readFileSync(join(cache, '.internal', 'steps', 's1.json'), 'utf8'), 'step');
  assert.equal(existsSync(join(cache, '.internal', 'extra.json')), false);
  rmSync(root, { recursive: true, force: true });
});

test('a fresh snapshot replaces the older one', () => {
  const { root, md, cache } = setup();
  snapshotCache(md, root);
  writeFileSync(join(cache, '.internal', 'execution.json'), 'v2');
  snapshotCache(md, root);
  writeFileSync(join(cache, '.internal', 'execution.json'), 'junk');
  restoreCache(md, root);
  assert.equal(readFileSync(join(cache, '.internal', 'execution.json'), 'utf8'), 'v2');
  rmSync(root, { recursive: true, force: true });
});

test('withRestoredCache restores before and after, even when the run throws', async () => {
  const { root, md, cache } = setup();
  snapshotCache(md, root);
  writeFileSync(join(cache, '.internal', 'execution.json'), 'dirty before');
  await assert.rejects(
    withRestoredCache(md, root, async () => {
      assert.equal(readFileSync(join(cache, '.internal', 'execution.json'), 'utf8'), 'clean'); // restored before
      writeFileSync(join(cache, '.internal', 'execution.json'), 'healed during run');
      throw new Error('kane crashed');
    }),
    /kane crashed/,
  );
  assert.equal(readFileSync(join(cache, '.internal', 'execution.json'), 'utf8'), 'clean'); // restored after
  rmSync(root, { recursive: true, force: true });
});

test('no cache at snapshot time: restore removes whatever a run created', () => {
  const root = mkdtempSync(join(tmpdir(), 'kane-cache-'));
  const md = join(root, 'a', 'a_test.md');
  mkdirSync(join(root, 'a'), { recursive: true });
  assert.equal(snapshotCache(md, root), false);
  mkdirSync(cacheDir(md));
  restoreCache(md, root);
  assert.equal(existsSync(cacheDir(md)), false);
  rmSync(root, { recursive: true, force: true });
});
