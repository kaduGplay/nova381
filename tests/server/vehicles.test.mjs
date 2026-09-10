import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVehicleApi } from '../../server/vehicles.mjs';

async function start(t, options) {
  const app = createVehicleApi(options);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}
const vehicle = { data: { placa: 'ABC1D23', marca: 'VW', modelo: 'GOL', ano: 2020,
  ano_modelo: 2021, cor: 'PRATA', proprietario: 'PRIVATE', cpf: 'PRIVATE', chassi: 'PRIVATE' } };

test('server authenticates, filters personal fields, deduplicates and caches lookup', async t => {
  let calls = 0;
  const base = await start(t, { token: 'server-only-secret', fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, 'https://beta.falcon-server.com.br/data-hub/private/v1/vehicles/ABC1D23/search');
    assert.equal(options.headers.Authorization, 'Bearer server-only-secret');
    await new Promise(resolve => setTimeout(resolve, 30));
    return Response.json(vehicle);
  } });
  const responses = await Promise.all([fetch(`${base}/ABC1D23`), fetch(`${base}/abc-1d23`)]);
  for (const response of responses) {
    assert.equal(response.status, 200);
    const json = await response.json();
    assert.equal(json.brand, 'VW'); assert.equal(json.modelYear, '2021');
    assert.equal(JSON.stringify(json).includes('PRIVATE'), false);
    assert.equal(JSON.stringify(json).includes('server-only-secret'), false);
  }
  await fetch(`${base}/ABC1D23`);
  assert.equal(calls, 1);
});

test('missing token and invalid plates never call the provider', async t => {
  let calls = 0;
  const base = await start(t, { token: '', fetchImpl: async () => { calls++; throw Error(); } });
  assert.equal((await fetch(`${base}/invalid`)).status, 400);
  assert.equal((await fetch(`${base}/ABC1D23`)).status, 503);
  assert.equal(calls, 0);
});

for (const status of [404, 429, 401, 500]) {
  test(`handles provider HTTP ${status}`, async t => {
    const base = await start(t, { token: 'test', fetchImpl: async () => new Response('private', { status }) });
    const response = await fetch(`${base}/ABC1D23`);
    assert.equal(response.status, [404,429].includes(status) ? status : 503);
    assert.equal((await response.text()).includes('private'), false);
  });
}

test('rejects data for a different plate', async t => {
  const base = await start(t, { token: 'test', fetchImpl: async () => Response.json({ data: { ...vehicle.data, placa: 'XYZ9A99' } }) });
  assert.equal((await fetch(`${base}/ABC1D23`)).status, 502);
});

test('caps uncached requests at ten per hour', async t => {
  let calls = 0; let time = Date.now();
  const base = await start(t, { token: 'test', now: () => time,
    fetchImpl: async () => { calls++; return new Response('', { status: 404 }); } });
  for (let i = 0; i < 10; i++) await fetch(`${base}/ABC1D23`);
  assert.equal((await fetch(`${base}/ABC1D23`)).status, 429);
  assert.equal(calls, 10);
  time += 3600001;
  assert.equal((await fetch(`${base}/ABC1D23`)).status, 404);
});
