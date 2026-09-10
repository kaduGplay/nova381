import express from 'express';
import { createVehicleApi } from '../../server/vehicles.mjs';

// Vite middleware only runs locally. Vercel discovers this server-side entry.
const app = express();
app.disable('x-powered-by');
app.use('/api/vehicles', createVehicleApi());
export default app;
