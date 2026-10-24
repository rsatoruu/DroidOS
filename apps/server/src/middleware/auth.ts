/**
 * Authentication middleware
 * Validates JWT from Authorization header or cookie
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '../services/auth.js';
import { logger } from '../logger.js';

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token =
    extractBearerToken(request.headers.authorization) ??
    request.cookies?.droidos_session;

  if (!token) {
    reply.status(401).send({ success: false, error: 'Authentication required' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    reply.status(401).send({ success: false, error: 'Invalid or expired session' });
    return;
  }

  // Attach user to request
  (request as any).user = payload;
}

function extractBearerToken(header?: string): string | null {
  if (!header) return null;
  const parts = header.split(' ');
  if (parts.length === 2 && parts[0]!.toLowerCase() === 'bearer') return parts[1]!;
  return null;
}
