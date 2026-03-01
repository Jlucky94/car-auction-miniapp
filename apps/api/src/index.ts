import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';

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
      : undefined;

  if (maybeValidation) {
    return reply.status(400).send(badRequest('Invalid request payload', maybeValidation));
  }

  const message = error instanceof Error ? error.message : 'An unexpected error occurred';

  return reply.status(500).send({
    code: 'INTERNAL_SERVER_ERROR',
    message
  } satisfies ErrorResponse);
});

async function getBalanceHandler(
  request: FastifyRequest<{ Querystring: { userId?: string } }>,
  reply: FastifyReply
): Promise<PlayerState | FastifyReply> {
  const { userId } = request.query;

  if (!userId || userId.trim().length === 0) {
    return reply.status(400).send(badRequest('userId query parameter is required'));
  }

  return getOrCreatePlayerState(userId);
}

async function postClickHandler(
  request: FastifyRequest<{ Body: { userId?: unknown } }>,
  reply: FastifyReply
): Promise<PlayerState | FastifyReply> {
  const { userId } = request.body;

  if (typeof userId !== 'string' || userId.trim().length === 0) {
    return reply.status(400).send(badRequest('userId is required and must be a non-empty string'));
  }

  const currentState = getOrCreatePlayerState(userId);
  const updatedState = applyClick(currentState);

  playerStates.set(userId, updatedState);

  return updatedState;
}

for (const prefix of ['/api/v1', '/v1'] as const) {
  app.get(`${prefix}/health`, async () => ({ status: 'ok' }));
  app.get(`${prefix}/balance`, getBalanceHandler);
  app.post(`${prefix}/click`, postClickHandler);
}

const port = Number(process.env.PORT ?? 3001);

await app.listen({ port, host: '0.0.0.0' });
app.log.info(`listening on 0.0.0.0:${port}`);
