import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import { applyClick, createInitialState, type PlayerState } from '@car-auction/shared';

import { validateTelegramInitData } from './auth.js';
import { signJwt, verifyJwt } from './jwt.js';

type ErrorResponse = {
  code: string;
  message: string;
  details?: unknown;
};

type User = {
  id: string;
  telegramId: number;
  firstName: string;
  lastName: string | null;
  username: string | null;
  languageCode: string | null;
  photoUrl: string | null;
};

type AppConfig = {
  telegramBotToken: string;
  jwtSecret: string;
  jwtExpiresIn: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getAppConfig(): AppConfig {
  return {
    telegramBotToken: getRequiredEnv('TELEGRAM_BOT_TOKEN'),
    jwtSecret: getRequiredEnv('JWT_SECRET'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d'
  };
}

export function buildApp(config: AppConfig) {
  const app = Fastify({ logger: true });
  const usersByTelegramId = new Map<number, User>();
  const statesByUserId = new Map<string, PlayerState>();

  function getUnauthorizedResponse() {
    return {
      code: 'UNAUTHORIZED',
      message: 'Authorization token is missing or invalid'
    } satisfies ErrorResponse;
  }

  function authorizeRequest(request: { headers: { authorization?: string } }, reply: { status: (code: number) => { send: (payload: ErrorResponse) => unknown } }): User | null {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.status(401).send(getUnauthorizedResponse());
      return null;
    }

    const token = authHeader.slice('Bearer '.length);
    const payload = verifyJwt(token, config.jwtSecret);
    if (!payload) {
      reply.status(401).send(getUnauthorizedResponse());
      return null;
    }

    const user = Array.from(usersByTelegramId.values()).find(
      (item) => item.id === payload.sub && item.telegramId === payload.telegramId
    );

    if (!user) {
      reply.status(401).send(getUnauthorizedResponse());
      return null;
    }

    return user;
  }

  function getOrCreatePlayerState(userId: string): PlayerState {
    const existingState = statesByUserId.get(userId);
    if (existingState) {
      return existingState;
    }

    const initialState = createInitialState();
    statesByUserId.set(userId, initialState);
    return initialState;
  }

  app.setErrorHandler((error, _request, reply) => {
    const maybeValidation =
      typeof error === 'object' && error !== null && 'validation' in error
        ? (error as { validation?: unknown }).validation
        : undefined;

    if (maybeValidation) {
      return reply.status(400).send({
        code: 'INVALID_INIT_DATA',
        message: 'Invalid request payload',
        details: maybeValidation
      } satisfies ErrorResponse);
    }

    const message = error instanceof Error ? error.message : 'An unexpected error occurred';

    return reply.status(500).send({
      code: 'INTERNAL_SERVER_ERROR',
      message
    } satisfies ErrorResponse);
  });

  app.get('/api/v1/health', async () => ({ status: 'ok' }));

  app.post('/api/v1/auth/telegram', async (request, reply) => {
    const body = request.body as { initData?: unknown };

    if (typeof body?.initData !== 'string' || body.initData.length === 0) {
      return reply.status(400).send({ code: 'INVALID_INIT_DATA', message: 'initData is required' });
    }

    let validated;
    try {
      validated = validateTelegramInitData(body.initData, config.telegramBotToken);
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_SIGNATURE') {
        return reply.status(401).send({
          code: 'INVALID_SIGNATURE',
          message: 'Telegram initData signature is invalid'
        });
      }

      return reply.status(400).send({ code: 'INVALID_INIT_DATA', message: 'Telegram initData is invalid' });
    }

    const telegramUser = validated.user;
    const existingUser = usersByTelegramId.get(telegramUser.id);

    const user: User = {
      id: existingUser?.id ?? randomUUID(),
      telegramId: telegramUser.id,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name ?? null,
      username: telegramUser.username ?? null,
      languageCode: telegramUser.language_code ?? null,
      photoUrl: telegramUser.photo_url ?? null
    };

    usersByTelegramId.set(telegramUser.id, user);

    const accessToken = signJwt({ sub: user.id, telegramId: user.telegramId }, config.jwtSecret, config.jwtExpiresIn);

    return { accessToken, user };
  });

  app.get('/api/v1/me', async (request, reply) => {
    const user = authorizeRequest(request, reply);
    if (!user) {
      return;
    }

    return user;
  });

  app.get('/api/v1/balance', async (request, reply) => {
    const user = authorizeRequest(request, reply);
    if (!user) {
      return;
    }

    const query = request.query as { userId?: unknown };
    if (typeof query.userId !== 'string' || query.userId.length === 0) {
      return reply.status(400).send({ code: 'INVALID_INIT_DATA', message: 'userId is required' });
    }

    if (query.userId !== user.id) {
      return reply.status(401).send(getUnauthorizedResponse());
    }

    const state = getOrCreatePlayerState(user.id);
    return { balance: state.balance };
  });

  app.post('/api/v1/click', async (request, reply) => {
    const user = authorizeRequest(request, reply);
    if (!user) {
      return;
    }

    const body = request.body as { userId?: unknown };
    if (typeof body.userId !== 'string' || body.userId.length === 0) {
      return reply.status(400).send({ code: 'INVALID_INIT_DATA', message: 'userId is required' });
    }

    if (body.userId !== user.id) {
      return reply.status(401).send(getUnauthorizedResponse());
    }

    const nextState = applyClick(getOrCreatePlayerState(user.id));
    statesByUserId.set(user.id, nextState);

    return { balance: nextState.balance };
  });

  return app;
}
