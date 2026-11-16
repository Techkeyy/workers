import { spawn } from 'node:child_process';

export function quote(arg, win = process.platform === 'win32') {
  const s = String(arg);
  if (/^[\w@+=:,./\\-]+$/.test(s)) return s;
  // POSIX: single quotes, nothing inside is interpreted (no $(), backticks or $VAR expansion).
  if (!win) return `'${s.replace(/'/g, `'\\''`)}'`;
  return `"${s.replace(/"/g, '\\"')}"`;
}

// Run a command (shell on Windows so .cmd shims like npx/claude work).
// Resolves {code, stdout, stderr}; never rejects on non-zero exit.
export function run(cmd, args = [], { cwd, env, input, timeoutMs, onLine } = {}) {
  return new Promise((resolve) => {
    const line = [cmd, ...args].map(quote).join(' ');
    const child = spawn(line, { cwd, env: { ...process.env, ...env }, shell: true, windowsHide: true });
    let stdout = '';
    let stderr = '';
    let buf = '';
    let timer;
    let timedOut = false;
    if (timeoutMs) timer = setTimeout(() => ((timedOut = true), killTree(child)), timeoutMs);
    child.stdout.on('data', (d) => {
      const s = d.toString();
      stdout += s;
      if (onLine) {
        buf += s;
        const parts = buf.split('\n');
        buf = parts.pop();
        parts.forEach(onLine);
      }
    });
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', (e) => resolve({ code: 127, stdout, stderr: stderr + e.message, timedOut }));
    child.on('close', (code) => {
      clearTimeout(timer);
      if (onLine && buf) onLine(buf);
      resolve({ code: code ?? 1, stdout, stderr, timedOut });
    });
    child.stdin.end(input !== undefined ? input : undefined);
  });
}

export function killTree(child) {
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
  else child.kill('SIGTERM');
}

export function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'test';
}

export const stripAnsi = (s) => String(s ?? '').replace(/\u001b\[[0-9;]*m/g, '');
