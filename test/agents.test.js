import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentError, resolveAgent } from '../src/agents.js';

const stub = (name, loggedIn) => ({ name, fix: `login to ${name}`, check: async () => loggedIn, run: async () => '' });

test('uses the requested agent when it is logged in', async () => {
  const t = { claude: stub('claude', true), codex: stub('codex', true) };
  assert.equal((await resolveAgent('claude', () => {}, t)).name, 'claude');
  assert.equal((await resolveAgent('codex', () => {}, t)).name, 'codex');
});

test('claude logged out + codex logged in -> falls back to codex and says so', async () => {
  const lines = [];
  const t = { claude: stub('claude', false), codex: stub('codex', true) };
  assert.equal((await resolveAgent('claude', (l) => lines.push(l), t)).name, 'codex');
  assert.equal(lines.length, 1);
  assert.match(lines[0], /claude is not logged in; using codex/);
});

test('neither logged in -> clear error naming the fix', async () => {
  const t = { claude: stub('claude', false), codex: stub('codex', false) };
  await assert.rejects(resolveAgent('claude', () => {}, t), (e) => e instanceof AgentError && /login to claude/.test(e.message));
  await assert.rejects(resolveAgent('codex', () => {}, t), /login to codex/);
  await assert.rejects(resolveAgent('nope', () => {}, t), /Unknown agent/);
});
