import Fastify from 'fastify';

const app = Fastify({ logger: true });

const userBalances = new Map<string, number>();

app.get('/health', async () => ({ ok: true }));

app.get('/api/v1/balance', async (request, reply) => {
  const { userId } = request.query as { userId?: string };

  if (!userId) {
    return reply.code(400).send({ error: 'userId is required' });
  }

  return { balance: userBalances.get(userId) ?? 0 };
});

app.post('/api/v1/click', async (request, reply) => {
  const { userId } = request.body as { userId?: string };

  if (!userId) {
    return reply.code(400).send({ error: 'userId is required' });
  }

  const currentBalance = userBalances.get(userId) ?? 0;
  const updatedBalance = currentBalance + 1;

  userBalances.set(userId, updatedBalance);

  return { balance: updatedBalance };
});

const port = Number(process.env.PORT ?? 3001);

await app.listen({ port, host: '0.0.0.0' });
