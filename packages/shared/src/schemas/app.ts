import { z } from 'zod';
import { APP_RUNTIME_TYPES } from '../constants.js';

export const CreateAppSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional().default(''),
  version: z.string().max(32).optional().default('1.0.0'),
  icon: z.string().optional(),
  category: z.string().max(64).optional().default('Custom'),
  runtime: z.enum(APP_RUNTIME_TYPES).optional().default('native'),
  workingDir: z.string().optional(),
  startCommand: z.string().min(1),
  stopCommand: z.string().optional(),
  envVars: z.record(z.string()).optional().default({}),
  port: z.number().int().min(1).max(65535).optional(),
  healthCheckUrl: z.string().url().optional(),
  restartPolicy: z.enum(['never', 'always', 'on-failure']).optional().default('on-failure'),
  maxRestarts: z.number().int().min(0).max(100).optional().default(3),
  dataDir: z.string().optional(),
  startupTimeoutSeconds: z.number().int().min(1).max(300).optional().default(30),
  installScript: z.string().optional(),
});

export const UpdateAppSchema = CreateAppSchema.partial();

export const AppEnvSchema = z.record(z.string(), z.string());
