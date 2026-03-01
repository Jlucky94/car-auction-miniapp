import Fastify from 'fastify';
import {
  applyClick,
  createInitialState,
  type AuthoritativeState
} from '@car-auction/shared';

const app = Fastify({ logger: true });

const store = new Map<string, AuthoritativeState>();

app.get('/api/v1/health', async () => ({ status: 'ok' }));

app.post<{
  Body: {
    userId: string;
  };
}>('/api/v1/click', async (request, reply) => {
  const { userId } = request.body;

  if (!userId) {
    return reply.code(400).send({ message: 'userId is required' });
  }

  const currentState = store.get(userId) ?? createInitialState();
  const nextState = applyClick(currentState);
  store.set(userId, nextState);

  return nextState;
});

const port = Number(process.env.PORT ?? 3001);

await app.listen({ port, host: '0.0.0.0' });
