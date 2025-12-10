/**
 * GET /api/discover
 * 
 * Returns a paginated list of candidate profiles with compatibility scores.
 * Excludes users the current user has already liked or matched with.
 * 
 * Query params:
 * - cursor: pagination cursor (user ID)
 * - lang: filter by language
 * - score_min: minimum compatibility score (0-1)
 * - limit: number of results (default 20, max 50)
 * 
 * Auth required: Yes
 * Response: CandidateProfile[]
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { computeCompatibility } from '@/lib/matcher';
import { discoverQuerySchema } from '@/lib/validation';
import { CandidateProfile, ProfileSummary } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CandidateProfile[] | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Validate query params
    const queryResult = discoverQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return res.status(400).json({ error: queryResult.error.message });
    }

    const { cursor, lang, score_min, limit } = queryResult.data;
    const currentUserId = session.user.id;

    // Get current user's profile
    const currentProfile = await prisma.profile.findUnique({
      where: { userId: currentUserId },
    });

    if (!currentProfile) {
      return res.status(400).json({ error: 'Please sync your profile first' });
    }

    const currentProfileSummary: ProfileSummary = {
      languages: currentProfile.languages as Record<string, number>,
      commitTraits: currentProfile.commitTraits as Record<string, number>,
      activityScore: currentProfile.activityScore,
      highlights: currentProfile.highlights,
    };

    // Get users the current user has already liked
    const existingLikes = await prisma.like.findMany({
      where: { fromUser: currentUserId },
      select: { toUser: true },
    });
    const likedUserIds = new Set(existingLikes.map(l => l.toUser));

    // Get users the current user has matched with
    const existingMatches = await prisma.match.findMany({
      where: {
        OR: [{ userA: currentUserId }, { userB: currentUserId }],
      },
      select: { userA: true, userB: true },
    });
    const matchedUserIds = new Set(
      existingMatches.flatMap(m => [m.userA, m.userB])
    );

    // Exclude current user, liked users, and matched users
    const excludeIds = new Set([
      currentUserId,
      ...likedUserIds,
      ...matchedUserIds,
    ]);

    // Build where clause for filtering
    const whereClause: Record<string, unknown> = {
      userId: { notIn: Array.from(excludeIds) },
    };

    // Filter by language if specified
    if (lang) {
      // Prisma JSON path filter for languages containing the specified language
      whereClause.languages = { path: [lang], not: null };
    }

    // Cursor-based pagination
    if (cursor) {
      whereClause.userId = { ...whereClause.userId as object, gt: cursor };
    }

    // Fetch candidate profiles
    const candidates = await prisma.profile.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: { userId: 'asc' },
      take: limit * 2, // Fetch extra for score filtering
    });

    // Compute compatibility scores and build response
    const results: CandidateProfile[] = [];

    for (const candidate of candidates) {
      if (results.length >= limit) break;

      const candidateSummary: ProfileSummary = {
        languages: candidate.languages as Record<string, number>,
        commitTraits: candidate.commitTraits as Record<string, number>,
        activityScore: candidate.activityScore,
        highlights: candidate.highlights,
      };

      const score = computeCompatibility(currentProfileSummary, candidateSummary);

      // Filter by minimum score if specified
      if (score_min !== undefined && score < score_min) {
        continue;
      }

      // Get last commit for snippet
      const lastCommit = await prisma.commit.findFirst({
        where: { userId: candidate.userId },
        orderBy: { date: 'desc' },
        select: { message: true },
      });

      results.push({
        userId: candidate.user.id,
        username: candidate.user.username,
        avatar: candidate.user.avatar,
        score,
        highlights: candidate.highlights,
        commitTraits: candidate.commitTraits as Record<string, number>,
        languages: candidate.languages as Record<string, number>,
        lastCommitSnippet: lastCommit?.message?.slice(0, 100),
      });
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return res.status(200).json(results);
  } catch (error) {
    console.error('Discover error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}

