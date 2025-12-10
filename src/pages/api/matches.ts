/**
 * GET /api/matches
 * 
 * Returns all matches for the current user.
 * 
 * Auth required: Yes
 * Response: { matches: MatchResponse[] }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MatchesResponse } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MatchesResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const currentUserId = session.user.id;

    // Fetch all matches involving the current user
    const matches = await prisma.match.findMany({
      where: {
        OR: [{ userA: currentUserId }, { userB: currentUserId }],
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get other user details for each match
    const matchResponses = await Promise.all(
      matches.map(async (match) => {
        const otherUserId = match.userA === currentUserId ? match.userB : match.userA;
        const otherUser = await prisma.user.findUnique({
          where: { id: otherUserId },
          select: { id: true, username: true, avatar: true },
        });

        return {
          id: match.id,
          userId: currentUserId,
          otherUser: otherUser || { id: otherUserId, username: 'Unknown', avatar: null },
          score: match.score,
          createdAt: match.createdAt.toISOString(),
        };
      })
    );

    return res.status(200).json({ matches: matchResponses });
  } catch (error) {
    console.error('Matches error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}

