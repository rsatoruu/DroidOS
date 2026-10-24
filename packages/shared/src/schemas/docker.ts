import { z } from 'zod';
import { DOCKER_HOST_TYPES } from '../constants.js';

export const CreateDockerHostSchema = z.object({
  name: z.string().min(1).max(64),
  type: z.enum(DOCKER_HOST_TYPES),
  host: z.string().min(1).max(253),
  port: z.number().int().min(1).max(65535).optional(),
  tlsEnabled: z.boolean().optional().default(false),
  sshUser: z.string().max(64).optional(),
  isDefault: z.boolean().optional().default(false),
});

export const UpdateDockerHostSchema = CreateDockerHostSchema.partial();
