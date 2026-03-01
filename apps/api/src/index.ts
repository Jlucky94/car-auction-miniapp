import Fastify from 'fastify';

import { applyClick, createInitialState, type PlayerState } from '@car-auction/shared';

type ErrorResponse = {
  code: string;
  message: string;
  details?: unknown;
};

const app = Fastify({ logger: true });
const playerStates = new Map<string, PlayerState>();

function badRequest(message: string, details?: unknown): ErrorResponse {
  return {
    code: 'BAD_REQUEST',
    message,
    ...(details !== undefined ? { details } : {})
  };
}

function getOrCreatePlayerState(userId: string): PlayerState {
  const existingState = playerStates.get(userId);

  if (existingState) {
    return existingState;
  }

  const initialState = createInitialState();
  playerStates.set(userId, initialState);

  return initialState;
}

app.setErrorHandler((error, _request, reply) => {
  const maybeValidation =
    typeof error === 'object' && error !== null && 'validation' in error
      ? (error as { validation?: unknown }).validation
      : undefined

  if (maybeValidation) {
    return reply.status(400).send(badRequest('Invalid request payload', maybeValidation))
  }

  const message = error instanceof Error ? error.message : 'An unexpected error occurred'

  return reply.status(500).send({
    code: 'INTERNAL_SERVER_ERROR',
    message
  } satisfies ErrorResponse)
})

app.get('/api/v1/health', async () => ({ status: 'ok' }));

app.get('/api/v1/balance', async (request, reply) => {
  const { userId } = request.query as { userId?: string };

  if (!userId || userId.trim().length === 0) {
    return reply.status(400).send(badRequest('userId query parameter is required'));
  }

  return getOrCreatePlayerState(userId);
});

app.post('/api/v1/click', async (request, reply) => {
  const { userId } = request.body as { userId?: unknown };

  if (typeof userId !== 'string' || userId.trim().length === 0) {
    return reply.status(400).send(badRequest('userId is required and must be a non-empty string'));
  }

  const currentState = getOrCreatePlayerState(userId);
  const updatedState = applyClick(currentState);

  playerStates.set(userId, updatedState);

  return updatedState;
});

const port = 3001;

await app.listen({ port, host: '0.0.0.0' });
app.log.info('listening on localhost:3001');
