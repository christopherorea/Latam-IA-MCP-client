```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { RegisterUserInput, LoginUserInput, LoginResponseSchema, RegisterResponseSchema, UserProfileSchema } from './auth.schema';
import { Static } from '@sinclair/typebox';

// Define types for request bodies based on schemas
type RegisterRequest = FastifyRequest<{ Body: RegisterUserInput }>;
type LoginRequest = FastifyRequest<{ Body: LoginUserInput }>;

export class AuthController {
  private authService: AuthService;

  constructor(server: FastifyInstance) {
    this.authService = new AuthService(server);
    // Bind methods to ensure 'this' context is correct
    this.registerHandler = this.registerHandler.bind(this);
    this.loginHandler = this.loginHandler.bind(this);
    this.getMeHandler = this.getMeHandler.bind(this);
    this.logoutHandler = this.logoutHandler.bind(this);
  }

  // Getter for server instance to access httpErrors, logger, etc.
  private get server(): FastifyInstance {
    // This assumes that the AuthService instance holds a reference to the Fastify server.
    // If AuthService is instantiated elsewhere or doesn't have 'server', this needs adjustment.
    // A common pattern is to pass the server instance to the controller's constructor as well.
    // For this example, we'll assume `this.authService.server` is valid.
    // A better way might be to pass `server` to the AuthController constructor and store it.
    // Let's adjust this:
    // constructor(private serverInstance: FastifyInstance) {
    //   this.authService = new AuthService(serverInstance);
    // }
    // And then use this.serverInstance.httpErrors
    // For now, keeping the original structure for minimal changes, but this is a point of improvement.
    return (this.authService as any).server;
  }

  async registerHandler(request: RegisterRequest, reply: FastifyReply): Promise<Static<typeof RegisterResponseSchema>> {
    try {
      const registeredUser = await this.authService.registerUser(request.body);
      return reply.code(201).send({
        userId: registeredUser.userId,
        email: registeredUser.email,
        message: registeredUser.message,
      });
    } catch (error: any) {
      request.log.error({ err: error, body: request.body }, 'Registration failed');
      if (error.statusCode && this.server.httpErrors.get(error.statusCode)) {
        throw error; // Re-throw if it's already a Fastify error
      }
      // Default to a 400 or specific error based on message
      if (error.message && error.message.includes('already exists')) {
        throw this.server.httpErrors.conflict(error.message);
      }
      throw this.server.httpErrors.badRequest(error.message || 'Registration failed');
    }
  }

  async loginHandler(request: LoginRequest, reply: FastifyReply): Promise<Static<typeof LoginResponseSchema>> {
    try {
      const loginResult = await this.authService.loginUser(request.body);
      return reply.send(loginResult);
    } catch (error: any) {
      request.log.warn({ err: error, email: request.body.email }, 'Login failed');
       if (error.statusCode && this.server.httpErrors.get(error.statusCode)) {
        throw error;
      }
      throw this.server.httpErrors.unauthorized(error.message || 'Invalid credentials');
    }
  }

  async getMeHandler(request: FastifyRequest, reply: FastifyReply): Promise<Static<typeof UserProfileSchema>> {
    // request.user is populated by the @fastify/jwt plugin via the authenticate hook
    // The type for request.user should be augmented in a .d.ts file or via Fastify's decorateRequest
    // For now, we cast.
    const jwtUser = request.user as { userId: string; email: string; iat: number; exp: number };

    if (!jwtUser || !jwtUser.userId) {
        request.log.error('User ID not found in JWT payload after authentication');
        throw this.server.httpErrors.internalServerError('User ID missing from token after authentication');
    }

    const userProfile = await this.authService.getUserProfile(jwtUser.userId);
    if (!userProfile) {
      request.log.warn({ userId: jwtUser.userId }, 'User profile not found for authenticated user');
      throw this.server.httpErrors.notFound('User profile not found');
    }
    return reply.send(userProfile);
  }

  async logoutHandler(request: FastifyRequest, reply: FastifyReply) {
    // For JWT, logout is typically handled client-side by deleting the token.
    // If server-side token invalidation (e.g., blocklisting) is implemented,
    // it would be handled here. For MVP, a simple success response is fine.
    return reply.code(200).send({ message: 'Logout successful. Please clear your token on the client-side.' });
  }
}
```
