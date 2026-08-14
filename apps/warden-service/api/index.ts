import { handle } from '@hono/node-server/vercel';
import { createVercelWardenService } from '../src/create-app.js';
import { prepareVercelRequest } from '../src/vercel-request.js';
import type { VercelIncomingMessage } from '../src/vercel-request.js';

export const runtime = 'nodejs';
export const maxDuration = 30;

const honoHandler = handle(createVercelWardenService(process.env));

export default function handler(
  request: VercelIncomingMessage,
  response: Parameters<typeof honoHandler>[1],
) {
  prepareVercelRequest(request);
  return honoHandler(request, response);
}
