/**
 * Input validation schemas using Zod
 */

import { z } from 'zod';

export const likeSchema = z.object({
  toUserId: z.string().uuid('Invalid user ID'),
});

export const messageSchema = z.object({
  matchId: z.string().uuid('Invalid match ID'),
  body: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
});

export const discoverQuerySchema = z.object({
  cursor: z.string().optional(),
  lang: z.string().optional(),
  score_min: z.coerce.number().min(0).max(1).optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export const profileIdSchema = z.object({
  id: z.string().uuid('Invalid profile ID'),
});

export const profileQuerySchema = z.object({
  redact: z.coerce.boolean().optional().default(false),
});

export type LikeInput = z.infer<typeof likeSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type DiscoverQuery = z.infer<typeof discoverQuerySchema>;

