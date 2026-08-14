import { handle } from '@hono/node-server/vercel';
import { createVercelWardenService } from '../src/create-app.js';

export const runtime = 'nodejs';
export const maxDuration = 30;

export default handle(createVercelWardenService(process.env));
