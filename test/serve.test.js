import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const get = (port, path) => new Promise((res, rej) => {
  const r = http.request({ host: '127.0.0.1', port, path, method: 'GET' }, (resp) => { resp.resume(); resp.on('end', () => res(resp.statusCode)); });
  r.on('error', rej);
  r.end();
});

for (const [name, file, port] of [['demo', 'demo/serve.js', 45731], ['shop', 'examples/shop/serve.js', 45732]]) {
  test(`${name} static server: bad percent-encoding is a 400 (no crash), ../ never leaves the app folder`, async () => {
    const child = spawn(process.execPath, [join(root, file)], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
    try {
      await once(child.stdout, 'data');
      assert.equal(await get(port, '/'), 200);
      assert.equal(await get(port, '/%'), 400);
      assert.equal(await get(port, '/%E0%A4%A'), 400);
      assert.equal(await get(port, '/..%2F..%2Fpackage.json'), 404); // normalize() clamps ../ to the app root
      assert.equal(await get(port, '/..%2Fapp-evil/x'), 404);
      assert.equal(await get(port, '/'), 200); // still alive
    } finally {
      child.kill();
    }
  });
}
