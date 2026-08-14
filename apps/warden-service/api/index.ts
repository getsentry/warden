import { handle } from '@hono/node-server/vercel';
import { createVercelWardenService } from '../src/create-app.js';
import {
  prepareVercelRequest,
  withForwardedProtocol,
} from '../src/vercel-request.js';
import type { VercelIncomingMessage } from '../src/vercel-request.js';

export const runtime = 'nodejs';
export const maxDuration = 30;

const app = createVercelWardenService(process.env);
const honoHandler = handle({
  fetch: withForwardedProtocol(app.fetch.bind(app)),
});

export default function handler(
  request: VercelIncomingMessage,
  response: Parameters<typeof honoHandler>[1],
) {
  prepareVercelRequest(request);
  return honoHandler(request, response);
}
