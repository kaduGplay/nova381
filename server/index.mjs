import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import express from 'express';
import { createApp } from './app.mjs';
import { createVoidpay } from './voidpay.mjs';

const databasePath = resolve(process.env.DATABASE_PATH || 'data/payments.sqlite');
mkdirSync(dirname(databasePath), { recursive: true, mode: 0o700 });
const port = Number(process.env.API_PORT || 3001);
const { app, db } = createApp({ gateway: createVoidpay(), databasePath,
  origin: process.env.APP_ORIGIN || 'http://127.0.0.1:5173' });
if (process.env.SERVE_DIST === 'true') {
  app.use(express.static(resolve('dist')));
  app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')));
}
const server = app.listen(port, '127.0.0.1', () => console.log(`Backend: http://127.0.0.1:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { db.close(); process.exit(0); }));
