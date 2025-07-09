```typescript
import { FastifyInstance, FastifyPluginOptions, FastifySchema } from 'fastify';
import { AuthController } from './auth.controller';
import {
  RegisterUserSchema,
  LoginUserSchema,
  LoginResponseSchema,
  RegisterResponseSchema,
  UserProfileSchema
} from './auth.schema';

// Define schemas for routes for Swagger documentation and validation
const registerSchema: FastifySchema = {
  description: 'Register a new user',
  tags: ['auth'],
  body: RegisterUserSchema,
import { Type } from '@sinclair/typebox'; // Import Type for error schemas

  response: {
    201: RegisterResponseSchema,
    400: Type.Object({ // Using TypeBox for error schemas
        statusCode: Type.Number(),
        error: Type.String(),
        message: Type.String()
    }),
    409: Type.Object({ // Conflict error
        statusCode: Type.Number(),
        error: Type.String(),
        message: Type.String()
    })
  },
};

const loginSchema: FastifySchema = {
  description: 'Login an existing user',
  tags: ['auth'],
  body: LoginUserSchema,
  response: {
    200: LoginResponseSchema,
    401: Type.Object({ // Unauthorized
        statusCode: Type.Number(),
        error: Type.String(),
        message: Type.String()
    })
  },
};

const getMeSchema: FastifySchema = {
  description: 'Get current authenticated user profile',
  tags: ['auth'],
  response: {
    200: UserProfileSchema,
    401: Type.Object({ // Unauthorized
        statusCode: Type.Number(),
        error: Type.String(),
        message: Type.String()
    }),
    404: Type.Object({ // Not Found
        statusCode: Type.Number(),
        error: Type.String(),
        message: Type.String()
    })
  },
  security: [{ bearerAuth: [] }] // Indicates JWT is required
};

const logoutSchema: FastifySchema = {
  description: 'Logout user (client-side token removal, server-side no-op for MVP)',
  tags: ['auth'],
  response: {
    200: Type.Object({ message: Type.String() }),
    401: Type.Object({ // Unauthorized
        statusCode: Type.Number(),
        error: Type.String(),
        message: Type.String()
    })
  },
  security: [{ bearerAuth: [] }]
};


export async function authRoutes(server: FastifyInstance, options: FastifyPluginOptions) {
  const authController = new AuthController(server);

  server.post('/register', { schema: registerSchema }, authController.registerHandler);
  server.post('/login', { schema: loginSchema }, authController.loginHandler);

  // These routes require authentication via the 'authenticate' hook defined in authPlugin.ts
  server.get('/me', { schema: getMeSchema, onRequest: [server.authenticate] }, authController.getMeHandler);
  server.post('/logout', { schema: logoutSchema, onRequest: [server.authenticate] }, authController.logoutHandler);
}
```
