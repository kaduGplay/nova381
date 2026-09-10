import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { PaymentError } from './voidpay.mjs';
import { createVehicleApi } from './vehicles.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const publicPayment = p => p ? ({ id: p.id, status: p.status, amountCents: p.amount_cents,
  transactionId: p.transaction_id, pixCode: p.pix_code }) : null;

export function createApp({ gateway, databasePath = ':memory:', origin = 'http://127.0.0.1:5173' }) {
  const db = new DatabaseSync(databasePath);
  db.exec(`PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS baskets (
      id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES sessions(id), plate TEXT NOT NULL,
      UNIQUE(owner, plate));
    CREATE TABLE IF NOT EXISTS passages (
      id TEXT PRIMARY KEY, basket TEXT NOT NULL REFERENCES baskets(id),
      amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PAID')));
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY, basket TEXT NOT NULL UNIQUE REFERENCES baskets(id),
      amount_cents INTEGER NOT NULL, status TEXT NOT NULL,
      transaction_id TEXT UNIQUE, pix_code TEXT, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS payment_passages (
      payment TEXT NOT NULL REFERENCES payments(id),
      passage TEXT NOT NULL UNIQUE REFERENCES passages(id), PRIMARY KEY(payment, passage));`);
  function atomic(fn) {
    db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  const app = express();
  app.disable('x-powered-by');
  app.use('/api/vehicles', createVehicleApi());
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  // Fail closed: a guessed webhook schema/token location must never settle debt.
  app.post('/api/webhooks/voidpay', (_req, res) => res.status(503).json({
    error: 'Confirmação indisponível: contrato de autenticação do webhook ainda não fornecido.',
  }));
  app.use('/api/demo', (req, _res, next) => {
    if (req.method !== 'GET' && req.get('origin') !== origin) {
      return next(new PaymentError('Origem da requisição não autorizada.', 403));
    }
    next();
  }, express.json({ limit: '8kb' }), (req, res, next) => {
    const token = req.headers.cookie?.split(';').map(c => c.trim()).find(c => c.startsWith('nova381_demo='))?.slice(13);
    let owner = token && /^[a-f0-9]{64}$/.test(token) ? hash(token) : null;
    if (!owner || !db.prepare('SELECT id FROM sessions WHERE id = ? AND expires > ?').get(owner, Date.now())) {
      if (req.method !== 'GET') return next(new PaymentError('Sessão expirada. Recarregue a página.', 401));
      const fresh = randomBytes(32).toString('hex'); owner = hash(fresh);
      db.prepare('INSERT INTO sessions VALUES (?, ?)').run(owner, Date.now() + 7 * 86400000);
      res.cookie('nova381_demo', fresh, { httpOnly: true, sameSite: 'strict', secure: origin.startsWith('https:'), maxAge: 7 * 86400000, path: '/' });
    }
    res.locals.owner = owner; next();
  });
  app.get('/api/demo/passages', (req, res) => {
    const plate = typeof req.query.plate === 'string' ? req.query.plate.toUpperCase() : '';
    if (!/^[A-Z0-9]{5,10}$/.test(plate)) throw new PaymentError('Placa inválida.', 400);
    const basket = atomic(() => {
      const existing = db.prepare('SELECT * FROM baskets WHERE owner = ? AND plate = ?').get(res.locals.owner, plate);
      if (existing) return existing;
      if (db.prepare('SELECT COUNT(*) AS count FROM baskets WHERE owner = ?').get(res.locals.owner).count >= 10)
        throw new PaymentError('Limite de consultas desta demonstração atingido.', 429);
      const b = { id: randomUUID() };
      db.prepare('INSERT INTO baskets VALUES (?, ?, ?)').run(b.id, res.locals.owner, plate);
      for (let i = 0; i < 3; i++) db.prepare('INSERT INTO passages(id, basket, amount_cents) VALUES (?, ?, 1620)').run(randomUUID(), b.id);
      return b;
    });
    const passages = db.prepare('SELECT id, amount_cents AS amountCents, status FROM passages WHERE basket = ? ORDER BY rowid').all(basket.id);
    const payment = db.prepare('SELECT * FROM payments WHERE basket = ?').get(basket.id);
    res.json({ passages, amountCents: passages.reduce((sum, p) => sum + p.amountCents, 0), payment: publicPayment(payment) });
  });
  app.post('/api/demo/payments', async (req, res) => {
    const ids = req.body?.passageIds;
    if (!req.body || Object.keys(req.body).some(k => k !== 'passageIds') || !Array.isArray(ids) ||
      ids.length !== 3 || new Set(ids).size !== 3 || ids.some(id => typeof id !== 'string' || id.length > 64))
      throw new PaymentError('Envie somente os IDs das três passagens.', 400);
    const reservation = atomic(() => {
      const passages = db.prepare(`SELECT p.* FROM passages p JOIN baskets b ON b.id = p.basket
        WHERE b.owner = ? AND p.id IN (?, ?, ?)`).all(res.locals.owner, ...ids);
      if (passages.length !== 3 || new Set(passages.map(p => p.basket)).size !== 1)
        throw new PaymentError('Passagens não encontradas nesta sessão.', 404);
      if (passages.some(p => p.status !== 'PENDING')) throw new PaymentError('Estas passagens já foram pagas.', 409);
      const existing = db.prepare('SELECT * FROM payments WHERE basket = ?').get(passages[0].basket);
      if (existing) return { existing };
      gateway.assertReady();
      const amountCents = passages.reduce((sum, p) => sum + p.amount_cents, 0);
      const id = randomUUID();
      db.prepare(`INSERT INTO payments(id, basket, amount_cents, status, created_at) VALUES (?, ?, ?, 'CREATING', ?)`)
        .run(id, passages[0].basket, amountCents, Date.now());
      for (const p of passages) db.prepare('INSERT INTO payment_passages VALUES (?, ?)').run(id, p.id);
      return { id, passages, amountCents };
    });
    if (reservation.existing) return res.json(publicPayment(reservation.existing));
    try {
      const result = await gateway.create(reservation);
      db.prepare('UPDATE payments SET status = ?, transaction_id = ?, pix_code = ? WHERE id = ?')
        .run(result.status, result.transactionId, result.pixCode, reservation.id);
    } catch (error) {
      db.prepare("UPDATE payments SET status = 'UNKNOWN' WHERE id = ?").run(reservation.id);
      throw error;
    }
    res.status(201).json(publicPayment(db.prepare('SELECT * FROM payments WHERE id = ?').get(reservation.id)));
  });
  app.get('/api/demo/payments/:id', (req, res) => {
    const payment = db.prepare(`SELECT p.* FROM payments p JOIN baskets b ON b.id = p.basket
      WHERE p.id = ? AND b.owner = ?`).get(req.params.id, res.locals.owner);
    if (!payment) throw new PaymentError('Pagamento não encontrado.', 404);
    res.json(publicPayment(payment));
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint não encontrado.' }));
  app.use((error, _req, res, _next) => {
    const known = error instanceof PaymentError;
    res.status(known ? error.status : error.type === 'entity.parse.failed' ? 400 : 500).json({
      error: known ? error.message : 'Não foi possível processar a solicitação.',
    });
  });
  return { app, db };
}
