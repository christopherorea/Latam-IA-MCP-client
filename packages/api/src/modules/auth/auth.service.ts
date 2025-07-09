```typescript
import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { RegisterUserInput, LoginUserInput, UserProfileType, RegisterResponseType, LoginResponseType } from './auth.schema';
import { User } from '../../types'; // Asumimos que User type se definirá en src/types.ts

export class AuthService {
  constructor(private server: FastifyInstance) {}

  async registerUser(data: RegisterUserInput): Promise<Omit<User, 'password_hash'> & { message: string }> {
    const { email, password } = data;

    const existingUserResult = await this.server.db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUserResult.rows.length > 0) {
      this.server.log.warn(`Registration attempt for existing email: ${email}`);
      throw this.server.httpErrors.conflict('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUserResult = await this.server.db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING user_id, email, created_at, updated_at',
      [email, hashedPassword]
    );

    const newUser = newUserResult.rows[0];

    return {
      userId: newUser.user_id,
      email: newUser.email,
      message: 'User registered successfully'
    };
  }

  async loginUser(data: LoginUserInput): Promise<LoginResponseType> {
    const { email, password } = data;

    const userResult = await this.server.db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      this.server.log.warn(`Login attempt for non-existent email: ${email}`);
      throw this.server.httpErrors.unauthorized('Invalid email or password');
    }

    const user: User = userResult.rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      this.server.log.warn(`Failed login attempt for user: ${email}`);
      throw this.server.httpErrors.unauthorized('Invalid email or password');
    }

    const tokenPayload = { userId: user.user_id, email: user.email };
    const accessToken = this.server.jwt.sign(tokenPayload);

    return {
      accessToken,
      user: {
        userId: user.user_id,
        email: user.email,
      },
    };
  }

  async getUserProfile(userId: string): Promise<UserProfileType | null> {
    const userResult = await this.server.db.query('SELECT user_id, email, created_at, updated_at FROM users WHERE user_id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return null;
    }
    const user = userResult.rows[0];
    return {
        userId: user.user_id,
        email: user.email,
    };
  }
}
```
