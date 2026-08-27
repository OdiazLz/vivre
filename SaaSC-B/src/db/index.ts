import { Pool } from 'pg';
import { config } from '../config/index.js';

export const pool = new Pool({
  connectionString: config.database.url,
  ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: config.database.sslRejectUnauthorized } : false,
  max: config.database.maxConnections,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (error) => console.error('Conexión PostgreSQL inactiva falló:', error));
