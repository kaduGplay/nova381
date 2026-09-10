import express from 'express';

const ENDPOINT = 'https://beta.falcon-server.com.br/data-hub/private/v1/vehicles/';
const normalize = value => value.toUpperCase().replace(/[^A-Z0-9]/g, '');
const validPlate = value => /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(value);

export function createVehicleApi({ token = process.env.VEHICLE_API_TOKEN, fetchImpl = fetch, now = Date.now } = {}) {
  const api = express();
  const cache = new Map();
  const pending = new Map();
  let calls = [];
  api.disable('x-powered-by');
  api.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  const fail = (status, code, message) => Object.assign(new Error(message), { status, code });
  const text = value => typeof value === 'string' && value.trim() ? value.trim().slice(0, 120) : null;
  const year = value => /^\d{4}$/.test(String(value)) ? String(value) : null;

  async function lookup(plate) {
    let response;
    try {
      response = await fetchImpl(`${ENDPOINT}${encodeURIComponent(plate)}/search`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(10000), redirect: 'error',
      });
    } catch { throw fail(503, 'UNAVAILABLE', 'A consulta do veículo está temporariamente indisponível.'); }
    if (response.status === 404) throw fail(404, 'NOT_FOUND', 'Veículo não encontrado para esta placa.');
    if (response.status === 429) throw fail(429, 'LIMIT', 'Limite gratuito de consultas atingido. Tente novamente mais tarde.');
    if ([401, 403].includes(response.status)) throw fail(503, 'AUTH', 'O serviço de consulta precisa ter seu acesso configurado.');
    if (!response.ok) throw fail(503, 'UNAVAILABLE', 'Não foi possível consultar o veículo neste momento.');
    let result;
    try { result = await response.json(); } catch { throw fail(502, 'INVALID_RESPONSE', 'O serviço retornou dados inválidos.'); }
    const data = result?.data;
    if (!data || typeof data !== 'object' || Array.isArray(data) ||
        typeof data.placa !== 'string' || normalize(data.placa) !== plate ||
        !text(data.marca) || !text(data.modelo)) {
      throw fail(502, 'INVALID_RESPONSE', 'Não foi possível confirmar os dados desta placa.');
    }
    // Explicit allowlist: never forward owner, document, chassis or raw response.
    const vehicle = {
      plate, brand: text(data.marca), model: text(data.modelo),
      year: year(data.ano), modelYear: year(data.ano_modelo), color: text(data.cor),
      source: 'Falcon Data Hub', consultedAt: new Date(now()).toISOString(),
    };
    cache.set(plate, { expires: now() + 3600000, vehicle });
    return vehicle;
  }
  api.get('/:plate', async (req, res) => {
    try {
      if (req.params.plate.length > 12) throw fail(400, 'INVALID_PLATE', 'Informe uma placa brasileira válida.');
      const plate = normalize(req.params.plate);
      if (!validPlate(plate)) throw fail(400, 'INVALID_PLATE', 'Consulta disponível apenas para placas brasileiras válidas.');
      if (!token?.trim()) throw fail(503, 'NOT_CONFIGURED', 'Consulta de veículo ainda não configurada.');
      for (const [key, entry] of cache) if (entry.expires <= now()) cache.delete(key);
      const cached = cache.get(plate);
      if (cached) return res.json(cached.vehicle);
      if (!pending.has(plate)) {
        calls = calls.filter(time => time > now() - 3600000);
        if (calls.length >= 10) throw fail(429, 'LIMIT', 'Limite gratuito de consultas atingido. Tente novamente mais tarde.');
        calls.push(now());
        pending.set(plate, lookup(plate).finally(() => pending.delete(plate)));
      }
      res.json(await pending.get(plate));
    } catch (error) {
      res.status(error.status || 503).json({ code: error.code || 'UNAVAILABLE',
        error: error.status ? error.message : 'Consulta indisponível no momento.' });
    }
  });
  return api;
}
