import 'dotenv/config';
import http from 'http';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

import { pool, execMany } from './storage/db.js';
import { registerRoutes } from './web/routes/index.js';
import { errorHandler, notFound } from './web/middlewares/errors.js';

import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger.js'; // читает src/docs/openapi-usof.yaml

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use('/uploads', express.static(path.join(__dirname, 'web', 'uploads')));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

registerRoutes(app);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.APP_URL || `http://localhost:${PORT}`;
const server = http.createServer(app);

async function bootstrap() {
  try {
    await pool.query('SELECT 1');

    if (process.env.DB_SYNC === 'force') {
      const schemaSql = await fs.readFile(path.join(__dirname, 'storage', 'schema.sql'), 'utf-8');
      await execMany(schemaSql);
    }

    if (process.env.SEED === 'true') {
      const { seed } = await import('./storage/seed.js');
      await seed();
    }

    server.listen(PORT, () => {
      console.log(`Server listening on ${BASE_URL}`);
      console.log(`Swagger UI:        ${BASE_URL}/api-docs`);
      console.log(`Healthcheck:       ${BASE_URL}/health`);
      console.log(`Uploads (static):  ${BASE_URL}/uploads`);
    });
  } catch (err) {
    console.error('FATAL: bootstrap failed:', err);
    process.exit(1);
  }
}

bootstrap();

export default app;
