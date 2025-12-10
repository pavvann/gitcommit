/**
 * POST /api/like
 * 
 * Records a like from the current user to another user.
 * If a mutual like exists, creates a match and returns it.
 * 
 * Request body: { toUserId: string }
 * Auth required: Yes
 * Response: { ok: true } or { ok: true, match: { id, userA, userB, score } }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { computeCompatibility } from '@/lib/matcher';
import { checkLikeRateLimit } from '@/lib/ratelimit';
import { likeSchema } from '@/lib/validation';
import { LikeResponse, ProfileSummary } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LikeResponse | { error: string; remaining?: number; resetAt?: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Validate request body
    const bodyResult = likeSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({ error: bodyResult.error.message });
    }

    const { toUserId } = bodyResult.data;
    const fromUserId = session.user.id;

    // Prevent self-like
    if (toUserId === fromUserId) {
      return res.status(400).json({ error: 'Cannot like yourself' });
    }

    // Check rate limit
    const rateLimit = await checkLikeRateLimit(fromUserId);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt.toISOString(),
      });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: toUserId },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        fromUser_toUser: { fromUser: fromUserId, toUser: toUserId },
      },
    });

    if (existingLike) {
      return res.status(400).json({ error: 'Already liked this user' });
    }

    // Create the like
    await prisma.like.create({
      data: {
        fromUser: fromUserId,
        toUser: toUserId,
      },
    });

    // Check for mutual like
    const mutualLike = await prisma.like.findUnique({
      where: {
        fromUser_toUser: { fromUser: toUserId, toUser: fromUserId },
      },
    });

    if (mutualLike) {
      // It's a match! Calculate compatibility score
      const [profileA, profileB] = await Promise.all([
        prisma.profile.findUnique({ where: { userId: fromUserId } }),
        prisma.profile.findUnique({ where: { userId: toUserId } }),
      ]);

      let score = 0.5; // Default score if profiles don't exist
      
      if (profileA && profileB) {
        const summaryA: ProfileSummary = {
          languages: profileA.languages as Record<string, number>,
          commitTraits: profileA.commitTraits as Record<string, number>,
          activityScore: profileA.activityScore,
          highlights: profileA.highlights,
        };
        const summaryB: ProfileSummary = {
          languages: profileB.languages as Record<string, number>,
          commitTraits: profileB.commitTraits as Record<string, number>,
          activityScore: profileB.activityScore,
          highlights: profileB.highlights,
        };
        score = computeCompatibility(summaryA, summaryB);
      }

      // Create match (userA is always the smaller ID for consistency)
      const [userA, userB] = fromUserId < toUserId 
        ? [fromUserId, toUserId] 
        : [toUserId, fromUserId];

      const match = await prisma.match.create({
        data: {
          userA,
          userB,
          score,
        },
      });

      return res.status(200).json({
        ok: true,
        match: {
          id: match.id,
          userA: match.userA,
          userB: match.userB,
          score: match.score,
        },
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Like error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}

