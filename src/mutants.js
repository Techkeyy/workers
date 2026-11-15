// Mutants: deliberate app breaks. apply() edits a file in place (keeping the exact original bytes in
// <file>.workers-backup); revert() restores them. Restored on success, on errors, on SIGINT, and at
// next startup if a previous run died.
import { copyFileSync, existsSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const BACKUP_SUFFIX = '.workers-backup';

export function loadMutants(path) {
  const list = JSON.parse(readFileSync(path, 'utf8'));
  for (const m of list) {
    for (const k of ['id', 'kind', 'description', 'file', 'find', 'replace']) {
      if (typeof m[k] !== 'string') throw new Error(`Mutant ${m.id ?? '?'} is missing "${k}"`);
    }
    if (m.kind !== 'bug' && m.kind !== 'refactor') throw new Error(`Mutant ${m.id}: kind must be "bug" or "refactor"`);
  }
  return list;
}

const active = new Set(); // files currently mutated (sync-revertable)

function revertFile(file) {
  const backup = file + BACKUP_SUFFIX;
  if (existsSync(backup)) {
    renameSync(backup, file); // exact original bytes
  }
  active.delete(file);
}

export function apply(appDir, mutant) {
  const file = resolve(appDir, mutant.file);
  const backup = file + BACKUP_SUFFIX;
  if (existsSync(backup)) throw new Error(`${backup} already exists; a previous run was interrupted. Remove or restore it first.`);
  const original = readFileSync(file);
  const text = original.toString('utf8');
  const first = text.indexOf(mutant.find);
  if (first === -1) throw new Error(`Mutant ${mutant.id}: "find" text not found in ${mutant.file}`);
  if (text.indexOf(mutant.find, first + 1) !== -1) throw new Error(`Mutant ${mutant.id}: "find" text is not unique in ${mutant.file}`);
  copyFileSync(file, backup);
  active.add(file);
  try {
    writeFileSync(file, text.slice(0, first) + mutant.replace + text.slice(first + mutant.find.length));
  } catch (e) {
    revertFile(file);
    throw e;
  }
  return file;
}

export function revert(appDir, mutant) {
  revertFile(resolve(appDir, mutant.file));
}

// Apply, run fn, always revert.
export async function withMutant(appDir, mutant, fn) {
  apply(appDir, mutant);
  try {
    return await fn();
  } finally {
    revert(appDir, mutant);
  }
}

// Restore any files left mutated by a run that died. Returns restored paths.
export function restoreLeftovers(appDir) {
  const restored = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules') continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(BACKUP_SUFFIX)) {
        renameSync(p, p.slice(0, -BACKUP_SUFFIX.length));
        restored.push(p.slice(0, -BACKUP_SUFFIX.length));
      }
    }
  };
  walk(resolve(appDir));
  return restored;
}

// Revert everything currently applied (used by the SIGINT handler; synchronous on purpose).
export function revertAllActive() {
  for (const file of [...active]) revertFile(file);
}

export function installSigintHandler(exit = (code) => process.exit(code)) {
  const handler = () => {
    revertAllActive();
    exit(130);
  };
  process.on('SIGINT', handler);
  process.on('SIGTERM', handler);
  return () => {
    process.off('SIGINT', handler);
    process.off('SIGTERM', handler);
  };
}
