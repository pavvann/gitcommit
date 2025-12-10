/**
 * GET /api/profile/:id
 * 
 * Returns a public profile by user ID.
 * Optionally redacts commit data if ?redact=true
 * 
 * Auth required: No (public endpoint)
 * Response: User profile data
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

interface ProfileResponse {
  id: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  profile: {
    languages: Record<string, number>;
    commitTraits: Record<string, number>;
    activityScore: number;
    highlights: string;
    lastSynced: string | null;
  } | null;
  commits?: Array<{
    sha: string;
    message: string;
    repo: string;
    date: string;
  }>;
  createdAt: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProfileResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, redact } = req.query;

    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid profile ID' });
    }

    const shouldRedact = redact === 'true';

    // Fetch user with profile
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        createdAt: true,
        profile: {
          select: {
            languages: true,
            commitTraits: true,
            activityScore: true,
            highlights: true,
            lastSynced: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const response: ProfileResponse = {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      profile: user.profile
        ? {
            languages: user.profile.languages as Record<string, number>,
            commitTraits: user.profile.commitTraits as Record<string, number>,
            activityScore: user.profile.activityScore,
            highlights: user.profile.highlights,
            lastSynced: user.profile.lastSynced?.toISOString() || null,
          }
        : null,
      createdAt: user.createdAt.toISOString(),
    };

    // Include commits unless redacted
    if (!shouldRedact) {
      const commits = await prisma.commit.findMany({
        where: { userId: id },
        orderBy: { date: 'desc' },
        take: 20,
        select: {
          sha: true,
          message: true,
          repo: true,
          date: true,
        },
      });

      response.commits = commits.map((c) => ({
        sha: c.sha,
        message: c.message,
        repo: c.repo,
        date: c.date.toISOString(),
      }));
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}

