import { handle } from '@hono/node-server/vercel';
import { createVercelWardenService } from '../src/create-app.js';
import { initServiceTelemetry, traceRequest } from '../src/sentry.js';
import { prepareVercelRequest } from '../src/vercel-request.js';
import type { VercelIncomingMessage } from '../src/vercel-request.js';

export const runtime = 'nodejs';
export const maxDuration = 300;

initServiceTelemetry(process.env);
const honoHandler = handle(createVercelWardenService(process.env));

export default traceRequest(function handler(
  request: VercelIncomingMessage,
  response: Parameters<typeof honoHandler>[1],
) {
  prepareVercelRequest(request);
  return honoHandler(request, response);
});
