// Agent adapters. Interface: { name, fix, check() -> boolean (logged in), run(prompt, {model}) -> text }.
// Workers writes files itself; agents only return text. Adding another agent = one more entry here.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from './util.js';

export class AgentError extends Error {}

const claude = {
  name: 'claude',
  fix: 'run `claude /login` (or pass --agent codex)',
  async check() {
    const r = await run('claude', ['auth', 'status']);
    try {
      return JSON.parse(r.stdout).loggedIn === true;
    } catch {
      return false;
    }
  },
  async run(prompt, { model } = {}) {
    // --tools "" = no built-in tools, so the agent cannot edit files.
    const args = ['-p', '--output-format', 'text', '--tools', ''];
    if (model) args.push('--model', model);
    claude.lastCommand = ['claude', ...args].join(' ');
    const r = await run('claude', args, { input: prompt, timeoutMs: 600000 });
    const out = r.stdout.trim();
    if (r.code !== 0 || !out || /^Not logged in/i.test(out)) {
      const why = /not logged in/i.test(out + r.stderr) ? 'claude is not logged in' : `claude exited with code ${r.code}`;
      throw new AgentError(`${why}: ${(r.stderr || out).trim().split('\n')[0]}. Fix: run \`claude /login\`.`);
    }
    return out;
  },
};

const codex = {
  name: 'codex',
  fix: 'run `codex login` (or pass --agent claude)',
  async check() {
    const r = await run('codex', ['login', 'status']);
    return r.code === 0 && /logged in/i.test(r.stdout + r.stderr);
  },
  async run(prompt, { model } = {}) {
    const dir = mkdtempSync(join(tmpdir(), 'workers-codex-'));
    const last = join(dir, 'last.txt');
    try {
      const args = ['exec', '--sandbox', 'read-only', '--skip-git-repo-check', '--ephemeral', '--output-last-message', '<tmpfile>'];
      if (model) args.push('-m', model);
      args.push('-'); // prompt from stdin
      codex.lastCommand = ['codex', ...args].join(' ');
      const real = args.map((a) => (a === '<tmpfile>' ? last : a));
      const r = await run('codex', real, { input: prompt, cwd: dir, timeoutMs: 600000 });
      let out = '';
      try {
        out = readFileSync(last, 'utf8').trim();
      } catch {}
      if (r.code !== 0 || !out) {
        const err = (r.stderr.match(/ERROR:.*/g) || [r.stderr.trim().split('\n').pop()]).pop() || '';
        let hint = 'Fix: run `codex login`.';
        if (/not supported/i.test(err)) hint = 'Fix: pass --agent-model <name> with a model your ChatGPT account supports (see ~/.codex/models_cache.json).';
        throw new AgentError(`codex failed (exit ${r.code}): ${err.slice(0, 200)}. ${hint}`);
      }
      return out;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
};

export const adapters = { claude, codex };

// Pick the agent: requested one (default claude); if claude is logged out and codex is logged in, fall back.
export async function resolveAgent(requested = 'claude', log = () => {}, table = adapters) {
  const want = table[requested];
  if (!want) throw new AgentError(`Unknown agent "${requested}". Use claude or codex.`);
  if (await want.check()) return want;
  if (requested === 'claude' && table.codex && (await table.codex.check())) {
    log('claude is not logged in; using codex instead (codex is logged in).');
    return table.codex;
  }
  throw new AgentError(`${want.name} is not logged in. Fix: ${want.fix}.`);
}
