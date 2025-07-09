```typescript
import { Type, Static } from '@sinclair/typebox';

export const RegisterUserSchema = Type.Object({
  email: Type.String({ format: 'email', errorMessage: 'Email inválido' }),
  password: Type.String({
    minLength: 8,
    errorMessage: {
      minLength: 'La contraseña debe tener al menos 8 caracteres.'
    }
  }),
});
export type RegisterUserInput = Static<typeof RegisterUserSchema>;

export const LoginUserSchema = Type.Object({
  email: Type.String({ format: 'email', errorMessage: 'Email inválido' }),
  password: Type.String({ minLength: 1, errorMessage: "La contraseña es requerida."}), // minLength 1 para asegurar que no esté vacío
});
export type LoginUserInput = Static<typeof LoginUserSchema>;

// Para la respuesta de login
export const LoginResponseSchema = Type.Object({
  accessToken: Type.String(),
  user: Type.Object({
    userId: Type.String(), // Asumiendo que el ID de usuario es un string (ej. UUID)
    email: Type.String({ format: 'email' }),
  }),
});
export type LoginResponseType = Static<typeof LoginResponseSchema>;

// Para la respuesta de /auth/me
export const UserProfileSchema = Type.Object({
  userId: Type.String(),
  email: Type.String({ format: 'email' }),
});
export type UserProfileType = Static<typeof UserProfileSchema>;

// Para la respuesta de registro
export const RegisterResponseSchema = Type.Object({
  userId: Type.String(),
  email: Type.String({ format: 'email' }),
  message: Type.String()
});
export type RegisterResponseType = Static<typeof RegisterResponseSchema>;
```
