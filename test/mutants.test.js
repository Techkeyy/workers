import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { apply, revert, withMutant, restoreLeftovers, revertAllActive, loadMutants, BACKUP_SUFFIX } from '../src/mutants.js';

function fixture(content = 'let a = 1;\r\nlet b = "x";\r\né\u0000') {
  const dir = mkdtempSync(join(tmpdir(), 'workers-mut-'));
  const file = join(dir, 'app.js');
  const bytes = Buffer.from(content, 'utf8');
  writeFileSync(file, bytes);
  return { dir, file, bytes };
}
const m = (over = {}) => ({ id: 'M', kind: 'bug', description: 'd', file: 'app.js', find: 'let a = 1;', replace: 'let a = 2;', ...over });

test('apply edits the file; revert restores the exact original bytes', () => {
  const { dir, file, bytes } = fixture();
  apply(dir, m());
  assert.match(readFileSync(file, 'utf8'), /let a = 2;/);
  assert.ok(existsSync(file + BACKUP_SUFFIX));
  revert(dir, m());
  assert.ok(readFileSync(file).equals(bytes));
  assert.ok(!existsSync(file + BACKUP_SUFFIX));
  rmSync(dir, { recursive: true });
});

test('apply throws when find is missing or not unique, and changes nothing', () => {
  const { dir, file, bytes } = fixture('x x');
  assert.throws(() => apply(dir, m({ find: 'nope' })), /not found/);
  assert.throws(() => apply(dir, m({ find: 'x' })), /not unique/);
  assert.ok(readFileSync(file).equals(bytes));
  assert.ok(!existsSync(file + BACKUP_SUFFIX));
  rmSync(dir, { recursive: true });
});

test('withMutant reverts on success and when the callback throws', async () => {
  const { dir, file, bytes } = fixture();
  const seen = await withMutant(dir, m(), async () => readFileSync(file, 'utf8').includes('let a = 2;'));
  assert.equal(seen, true);
  assert.ok(readFileSync(file).equals(bytes));
  await assert.rejects(withMutant(dir, m(), async () => { throw new Error('boom'); }), /boom/);
  assert.ok(readFileSync(file).equals(bytes));
  assert.ok(!existsSync(file + BACKUP_SUFFIX));
  rmSync(dir, { recursive: true });
});

test('restoreLeftovers repairs a file from a run that died', () => {
  const { dir, file, bytes } = fixture();
  apply(dir, m()); // simulate a crash: never reverted
  const restored = restoreLeftovers(dir);
  assert.deepEqual(restored, [file]);
  assert.ok(readFileSync(file).equals(bytes));
  rmSync(dir, { recursive: true });
});

test('revertAllActive (what the SIGINT handler calls) restores applied mutants', () => {
  const { dir, file, bytes } = fixture();
  apply(dir, m());
  revertAllActive();
  assert.ok(readFileSync(file).equals(bytes));
  rmSync(dir, { recursive: true });
});

test('a real SIGINT/termination of a process mid-mutation leaves the file restored', async () => {
  const { dir, file, bytes } = fixture();
  const script = join(dir, 'child.mjs');
  const mod = new URL('../src/mutants.js', import.meta.url).href;
  writeFileSync(script, `import {apply, installSigintHandler} from ${JSON.stringify(mod)};
installSigintHandler();
apply(${JSON.stringify(dir)}, ${JSON.stringify(m())});
console.log('applied');
setInterval(()=>{}, 1000);
// simulate Ctrl+C by signalling ourselves
setTimeout(()=>process.emit('SIGINT'), 300);`);
  const r = spawnSync(process.execPath, [script], { encoding: 'utf8', timeout: 15000 });
  assert.match(r.stdout, /applied/);
  assert.equal(r.status, 130);
  assert.ok(readFileSync(file).equals(bytes));
  rmSync(dir, { recursive: true });
});

test('loadMutants validates the shape and the demo mutants file loads', () => {
  const list = loadMutants(fileURLToPath(new URL('../demo/workers.mutants.json', import.meta.url)));
  assert.deepEqual(list.map((x) => x.id), ['B1', 'B2', 'B3', 'B4', 'B5', 'R1', 'R2']);
  const { dir } = fixture();
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'bad.json'), JSON.stringify([{ id: 'X', kind: 'oops' }]));
  assert.throws(() => loadMutants(join(dir, 'bad.json')), /missing/);
  rmSync(dir, { recursive: true });
});

test('every demo mutant "find" occurs exactly once in the current demo app', () => {
  const root = fileURLToPath(new URL('../demo/app/', import.meta.url));
  const list = loadMutants(fileURLToPath(new URL('../demo/workers.mutants.json', import.meta.url)));
  for (const mu of list) {
    const text = readFileSync(join(root, mu.file), 'utf8');
    assert.equal(text.split(mu.find).length - 1, 1, mu.id);
  }
});
