import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ensureServer } from '../src/server.js';

// The Playwright config's webServer.env (for example PORT) must reach the app Workers starts.
test('ensureServer passes webServer.env to the started command', async () => {
  const port = 4300 + Math.floor(Math.random() * 500);
  const command = `node -e "require('http').createServer((q,r)=>r.end('ok')).listen(Number(process.env.PORT))"`;
  const stop = await ensureServer({ url: `http://localhost:${port}/`, command, cwd: process.cwd(), env: { PORT: String(port) } });
  try {
    const res = await fetch(`http://localhost:${port}/`);
    assert.equal(await res.text(), 'ok');
  } finally {
    await stop();
  }
});
