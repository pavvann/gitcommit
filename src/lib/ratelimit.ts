/**
 * Rate limiting utilities for likes and messages
 * 
 * Limits:
 * - 60 likes per day per user
 * - 200 messages per day per user
 */

import { prisma } from './prisma';
import { RATE_LIMITS } from '@/types';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check and update rate limit for likes
 */
export async function checkLikeRateLimit(userId: string): Promise<RateLimitResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { likesCount: true, likesResetAt: true },
  });

  if (!user) {
    return { allowed: false, remaining: 0, resetAt: new Date() };
  }

  const now = new Date();
  const resetAt = new Date(user.likesResetAt);
  
  // Check if we need to reset the counter (new day)
  if (now > resetAt) {
    // Reset counter for new day
    const newResetAt = new Date(now);
    newResetAt.setHours(24, 0, 0, 0); // Next midnight
    
    await prisma.user.update({
      where: { id: userId },
      data: { likesCount: 1, likesResetAt: newResetAt },
    });

    return {
      allowed: true,
      remaining: RATE_LIMITS.LIKES_PER_DAY - 1,
      resetAt: newResetAt,
    };
  }

  // Check if under limit
  if (user.likesCount >= RATE_LIMITS.LIKES_PER_DAY) {
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Increment counter
  await prisma.user.update({
    where: { id: userId },
    data: { likesCount: user.likesCount + 1 },
  });

  return {
    allowed: true,
    remaining: RATE_LIMITS.LIKES_PER_DAY - user.likesCount - 1,
    resetAt,
  };
}

/**
 * Check and update rate limit for messages
 */
export async function checkMessageRateLimit(userId: string): Promise<RateLimitResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { messagesCount: true, messagesResetAt: true },
  });

  if (!user) {
    return { allowed: false, remaining: 0, resetAt: new Date() };
  }

  const now = new Date();
  const resetAt = new Date(user.messagesResetAt);
  
  // Check if we need to reset the counter (new day)
  if (now > resetAt) {
    // Reset counter for new day
    const newResetAt = new Date(now);
    newResetAt.setHours(24, 0, 0, 0); // Next midnight
    
    await prisma.user.update({
      where: { id: userId },
      data: { messagesCount: 1, messagesResetAt: newResetAt },
    });

    return {
      allowed: true,
      remaining: RATE_LIMITS.MESSAGES_PER_DAY - 1,
      resetAt: newResetAt,
    };
  }

  // Check if under limit
  if (user.messagesCount >= RATE_LIMITS.MESSAGES_PER_DAY) {
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Increment counter
  await prisma.user.update({
    where: { id: userId },
    data: { messagesCount: user.messagesCount + 1 },
  });

  return {
    allowed: true,
    remaining: RATE_LIMITS.MESSAGES_PER_DAY - user.messagesCount - 1,
    resetAt,
  };
}

/**
 * Check if message contains spam (URLs)
 */
export function isSpamMessage(body: string): boolean {
  const spamPattern = /(http|https):\/\/\S+/;
  return spamPattern.test(body);
}

