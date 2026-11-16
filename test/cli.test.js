import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const bin = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'workers.js');

test('a failing agent (e.g. a rejected default model) makes the CLI exit non-zero with the message', () => {
  const dir = mkdtempSync(join(tmpdir(), 'workers-cli-'));
  try {
    const win = process.platform === 'win32';
    const stub = (name, loggedIn) => {
      const f = join(dir, win ? `${name}.cmd` : name);
      writeFileSync(f, win
        ? `@echo off\r\nif "%1"=="login" (echo Logged in& exit /b 0)\r\nif "%1"=="auth" (echo {"loggedIn":${loggedIn}}& exit /b 0)\r\necho ERROR: model not supported 1>&2\r\nexit /b 1\r\n`
        : `#!/bin/sh\nif [ "$1" = login ]; then echo Logged in; exit 0; fi\nif [ "$1" = auth ]; then echo '{"loggedIn":${loggedIn}}'; exit 0; fi\necho 'ERROR: model not supported' >&2\nexit 1\n`);
      if (!win) chmodSync(f, 0o755);
    };
    stub('claude', 'false');
    stub('codex', 'true');
    const r = spawnSync(process.execPath, [bin, 'demo', '--dry-run', '--max-tests', '1', '--out', join(dir, 'out')], {
      env: { ...process.env, PATH: dir + delimiter + process.env.PATH },
      encoding: 'utf8',
      timeout: 120000,
    });
    assert.notEqual(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stderr, /workers: codex failed/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an unknown command or missing option exits non-zero', () => {
  assert.equal(spawnSync(process.execPath, [bin, 'nope'], { encoding: 'utf8' }).status, 2);
  assert.equal(spawnSync(process.execPath, [bin, 'port'], { encoding: 'utf8' }).status, 2);
});
