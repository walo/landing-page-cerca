import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Middleware para parsear JSON en el backend de la landing
app.use(express.json());

/**
 * API interna de la Landing: registro de conjunto.
 * Actúa como fachada HTTP hacia la Edge Function pública `register-client`
 * del proyecto Supabase Suscripciones.
 */
const SUPABASE_URL =
  process.env['SUPABASE_URL'] ?? 'https://fervyhznyunpyunevmzb.supabase.co';
const SUPABASE_ANON_KEY =
  process.env['SUPABASE_ANON_KEY'] ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlcnZ5aHpueXVucHl1bmV2bXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyODcyMTUsImV4cCI6MjA3Nzg2MzIxNX0.J4AQWiUBCQCU8g-XYSWvTo2nGsKPGAD8o75ia-dsgSc';

app.post('/api/registro-conjunto', async (req, res) => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/register-client`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(req.body),
      },
    );

    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    res.status(response.status).json(data);
  } catch (error) {
    // Error interno al comunicarse con Supabase
    console.error('Error en /api/registro-conjunto:', error);
    res.status(500).json({
      error: 'Error interno del servidor. Por favor intenta nuevamente.',
    });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
