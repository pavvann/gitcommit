/**
 * POST /api/sync
 * 
 * Fetches the last 100 public commits for the authenticated user,
 * persists them to the database, and updates their profile summary.
 * 
 * Auth required: Yes (session)
 * Response: { ok: true, profile: ProfileSummary }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fetchUserCommits, fetchReposLanguages } from '@/lib/github';
import { parseCommits } from '@/lib/parser';
import { SyncResponse } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SyncResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { id: userId, username } = session.user;
    const accessToken = session.accessToken;

    // Fetch commits from GitHub
    const commits = await fetchUserCommits(username, accessToken);

    if (commits.length === 0) {
      // Create empty profile if no commits
      const profile = parseCommits([]);
      
      await prisma.profile.upsert({
        where: { userId },
        update: {
          languages: profile.languages,
          commitTraits: profile.commitTraits,
          activityScore: profile.activityScore,
          highlights: profile.highlights,
          lastSynced: new Date(),
        },
        create: {
          userId,
          languages: profile.languages,
          commitTraits: profile.commitTraits,
          activityScore: profile.activityScore,
          highlights: profile.highlights,
          lastSynced: new Date(),
        },
      });

      return res.status(200).json({ ok: true, profile });
    }

    // Fetch language data for repos
    const repos = [...new Set(commits.map(c => c.repo))];
    const repoLanguages = await fetchReposLanguages(repos, accessToken);

    // Parse commits to generate profile summary
    const profile = parseCommits(commits, repoLanguages);

    // Upsert commits (ignore duplicates)
    for (const commit of commits) {
      await prisma.commit.upsert({
        where: {
          userId_sha: { userId, sha: commit.sha },
        },
        update: {
          message: commit.message,
          repo: commit.repo,
          date: new Date(commit.date),
        },
        create: {
          userId,
          sha: commit.sha,
          message: commit.message,
          repo: commit.repo,
          date: new Date(commit.date),
        },
      });
    }

    // Upsert profile
    await prisma.profile.upsert({
      where: { userId },
      update: {
        languages: profile.languages,
        commitTraits: profile.commitTraits,
        activityScore: profile.activityScore,
        highlights: profile.highlights,
        lastSynced: new Date(),
      },
      create: {
        userId,
        languages: profile.languages,
        commitTraits: profile.commitTraits,
        activityScore: profile.activityScore,
        highlights: profile.highlights,
        lastSynced: new Date(),
      },
    });

    return res.status(200).json({ ok: true, profile });
  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}

