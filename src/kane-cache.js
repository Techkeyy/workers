import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

// Kane keeps a per-test cache in `output-<stem>/` next to `<stem>_test.md`. With self-healing on, a mutant
// run can rewrite that cache, so Workers snapshots it after clean authoring and restores it around every
// mutant run (design decision of 2026-11-16, replaces rule M1).

const stemOf = (mdPath) => basename(mdPath).replace(/_test\.md$/, '');
export const cacheDir = (mdPath) => join(dirname(mdPath), `output-${stemOf(mdPath)}`);
export const snapshotDir = (outDir, mdPath) => join(outDir, '.snapshots', stemOf(mdPath));

// retries cover short-lived Windows locks (antivirus, indexer) on freshly written files
const rmOpts = { recursive: true, force: true, maxRetries: 5, retryDelay: 200 };

// Copy the test's cache folder to the snapshot dir (replacing any older snapshot).
// Returns false when Kane left no cache folder (then restore simply removes any cache).
export function snapshotCache(mdPath, outDir) {
  const src = cacheDir(mdPath);
  const dst = snapshotDir(outDir, mdPath);
  rmSync(dst, rmOpts);
  if (!existsSync(src)) return false;
  mkdirSync(dirname(dst), { recursive: true });
  cpSync(src, dst, { recursive: true });
  return true;
}

// Delete the live cache folder, then copy the snapshot back.
export function restoreCache(mdPath, outDir) {
  const live = cacheDir(mdPath);
  const snap = snapshotDir(outDir, mdPath);
  rmSync(live, rmOpts);
  if (existsSync(snap)) cpSync(snap, live, { recursive: true });
}

// Restore before AND after fn, also when fn throws.
export async function withRestoredCache(mdPath, outDir, fn) {
  restoreCache(mdPath, outDir);
  try {
    return await fn();
  } finally {
    restoreCache(mdPath, outDir);
  }
}
