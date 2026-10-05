import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

async function withServer(statuses: number[], fn: (calls: () => number) => Promise<void>) {
  let calls = 0;
  const server = createServer((req, res) => {
    const status = statuses[Math.min(calls, statuses.length - 1)];
    calls++;
    res.writeHead(status).end();
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  process.env.API_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.WORKER_API_TOKEN = 'test-token';
  try {
    await fn(() => calls);
  } finally {
    server.close();
  }
}

test('status updates retry transient failures, then succeed', async () => {
  await withServer([503, 500, 200], async (calls) => {
    const { updateVideoStatus } = await import('./index');
    assert.equal(await updateVideoStatus('v1', 'active', 1, undefined, undefined, 5, 1), true);
    assert.equal(calls(), 3);
  });
});

test('a rejected status update (4xx) is not retried', async () => {
  await withServer([401], async (calls) => {
    const { updateVideoStatus } = await import('./index');
    assert.equal(await updateVideoStatus('v1', 'active', 1, undefined, undefined, 5, 1), false);
    assert.equal(calls(), 1);
  });
});

test('gives up after the retry budget when the API stays down', async () => {
  await withServer([503], async (calls) => {
    const { updateVideoStatus } = await import('./index');
    assert.equal(await updateVideoStatus('v1', 'active', 1, undefined, undefined, 3, 1), false);
    assert.equal(calls(), 3);
  });
});
