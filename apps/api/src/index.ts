import Fastify from 'fastify';

import {
  applyClick,
  createInitialState,
  type AuthoritativeState as PlayerState
} from '@car-auction/shared';

const app = Fastify({ logger: true });

const playerStates = new Map<string, PlayerState>();

app.setErrorHandler((error, _request, reply) => {
  if (error.validation) {
    return reply.status(400).send({
      code: 'BAD_REQUEST',
      message: error.message
    });
  }

  return reply.status(500).send({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred'
  });
});

app.get('/api/v1/health', async () => ({ status: 'ok' }));

app.post('/api/v1/click', async (request, reply) => {
  const { userId } = request.body as { userId?: string };

  if (!userId) {
    return reply.status(400).send({
      code: 'BAD_REQUEST',
      message: 'userId is required'
    });
  }

  const currentState = playerStates.get(userId) ?? createInitialState();
  const updatedState = applyClick(currentState);

  playerStates.set(userId, updatedState);

  return updatedState;
});

const port = Number(process.env.PORT ?? 3001);

await app.listen({ port, host: '0.0.0.0' });
app.log.info(`Server listening on http://localhost:${port}`);
