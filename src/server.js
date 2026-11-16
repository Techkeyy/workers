import { spawn } from 'node:child_process';
import { killTree } from './util.js';

async function up(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(1500) })).ok;
  } catch {
    return false;
  }
}

// Make sure the app is being served at `url`. Returns a stop() function.
export async function ensureServer({ url, command, cwd, env }) {
  if (await up(url)) return async () => {};
  if (!command) throw new Error(`Nothing is serving ${url} and the Playwright config has no webServer.command to start it.`);
  // webServer.env from the Playwright config (for example PORT) applies here too
  const child = spawn(command, { cwd, shell: true, stdio: 'ignore', windowsHide: true, env: { ...process.env, ...(env ?? {}) } });
  for (let i = 0; i < 40; i++) {
    if (await up(url)) return async () => killTree(child);
    await new Promise((r) => setTimeout(r, 500));
  }
  killTree(child);
  throw new Error(`App did not come up at ${url} using "${command}".`);
}
