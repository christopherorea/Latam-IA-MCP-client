```typescript
import Fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import fastifyEnv, { envOptions } from './config';
import dbPlugin from './plugins/db';
import corsPlugin from '@fastify/cors';
import helmetPlugin from '@fastify/helmet';

import authPlugin from './plugins/authPlugin';
import { authRoutes } from './modules/auth/auth.routes';

async function buildServer(opts: FastifyServerOptions = {}): Promise<FastifyInstance> {
  const server = Fastify(opts).withTypeProvider<TypeBoxTypeProvider>();

  // Register core plugins
  await server.register(fastifyEnv, envOptions);

  // Access config after envPlugin is registered
  const config = server.config;

  await server.register(corsPlugin, {
    origin: (origin, cb) => {
      // Allow all origins in development, configure for production
      // For MVP, we can be permissive.
      // const allowedOrigins = ['http://localhost:5173']; // Add your frontend URL
      // if (!origin || allowedOrigins.includes(origin)) {
      //   cb(null, true);
      //   return;
      // }
      // cb(new Error('Not allowed by CORS'), false);
      cb(null, true); // Allow all for now
    },
    credentials: true,
  });
  await server.register(helmetPlugin, {
    contentSecurityPolicy: false, // Potentially relax for MVP if causing issues, review for production
  });

  // Register custom plugins
  await server.register(dbPlugin); // This now depends on config being loaded
  await server.register(authPlugin); // Register JWT auth plugin

  // Register application modules (routes)
  server.register(authRoutes, { prefix: '/api/v1/auth' });

  server.get('/health', async (request, reply) => {
    try {
      await server.db.query('SELECT 1');
      reply.code(200).send({ status: 'ok', timestamp: new Date().toISOString(), database: 'connected' });
    } catch (e: any) {
      server.log.error(e, 'Health check failed - database connection issue');
      reply.code(500).send({ status: 'error', message: 'Database connection failed', error: e.message });
    }
  });

  server.get('/', async (request, reply) => {
    reply.send({ message: 'Welcome to MCP API v1' });
  });

  // Basic error handler
  server.setErrorHandler(function (error, request, reply) {
    server.log.error(error);
    // Send error response
    reply.status(error.statusCode || 500).send({
      error: {
        message: error.message,
        ...(process.env.NODE_ENV !== 'production' ? { stack: error.stack } : {})
      }
    });
  });

  return server;
}

async function start() {
  let server: FastifyInstance | undefined;
  try {
    const envLogLevel = process.env.LOG_LEVEL || 'info';
    server = await buildServer({
      logger: {
        level: envLogLevel,
        transport: process.env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
      },
    });

    await server.ready(); // Ensure all plugins are loaded

    // Access config after it's loaded by fastify-env
    const port = server.config.PORT;
    const host = server.config.HOST;

    await server.listen({ port, host });
    // Fastify's logger will automatically log the listening address if logger is enabled
  } catch (err) {
    if (server) {
      server.log.error(err);
    } else {
      console.error('Failed to start server:', err);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

// For testing purposes or programmatic use
export { buildServer };
```
