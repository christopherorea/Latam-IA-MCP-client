```typescript
import { Static, Type } from '@sinclair/typebox';
import FastifyEnv, { FastifyEnvOptions } from '@fastify/env';

const schema = Type.Object({
  PORT: Type.Number({ default: 3001 }),
  HOST: Type.String({ default: '0.0.0.0' }),
  DATABASE_URL: Type.String(),
  JWT_SECRET: Type.String(),
  JWT_EXPIRES_IN: Type.String({ default: '1h' }),
  LOG_LEVEL: Type.String({ default: 'info' }),
});

type EnvSchemaType = Static<typeof schema>;

declare module 'fastify' {
  interface FastifyInstance {
    config: EnvSchemaType;
  }
}

export const envOptions: FastifyEnvOptions = {
  confKey: 'config',
  schema: schema,
  dotenv: true, // Load .env file
  // data: process.env // You can also pass pre-loaded environment variables
};

export default FastifyEnv;
```
