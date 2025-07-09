```typescript
import fp from 'fastify-plugin';
import fastifyJwt, { JWT } from '@fastify/jwt';
import { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user: JWT['user']; // o un tipo más específico si defines el payload del token
  }
}

export default fp(async (fastify, opts) => {
  await fastify.register(fastifyJwt, {
    secret: fastify.config.JWT_SECRET,
    sign: {
      expiresIn: fastify.config.JWT_EXPIRES_IN,
    },
  });

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      fastify.log.warn({ err }, 'JWT authentication failed');
      reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or missing token' });
    }
  });
});
```
