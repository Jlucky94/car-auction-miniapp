import Fastify from 'fastify';
import { createInitialState, tap } from '@car-auction/shared';

const app = Fastify({ logger: true });

app.get('/health', async () => ({ ok: true }));

app.get('/game/sample-tap', async () => {
  const initial = createInitialState();
  return tap(initial);
});

const port = Number(process.env.PORT ?? 3001);

await app.listen({ port, host: '0.0.0.0' });
