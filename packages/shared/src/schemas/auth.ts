import { z } from 'zod';

export const LoginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(256),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(256),
});

export const SetupAdminSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(256),
  email: z.string().email().optional(),
});
