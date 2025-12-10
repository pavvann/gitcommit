/**
 * Worker script for processing commits
 * 
 * This can be run standalone with: npm run worker
 * Or imported as a serverless function.
 * 
 * Functions:
 * - Sync commits for all users or a specific user
 * - Recompute profiles
 * - Clean up old data
 */

import { PrismaClient } from '@prisma/client';
import { parseCommits } from '@/lib/parser';
import { fetchUserCommits, fetchReposLanguages } from '@/lib/github';
import { Commit } from '@/types';

const prisma = new PrismaClient();

interface SyncOptions {
  userId?: string;
  forceRefresh?: boolean;
}

/**
 * Sync commits for a user and update their profile
 */
export async function syncUserCommits(
  userId: string,
  accessToken?: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true },
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  console.log(`Syncing commits for ${user.username}...`);

  // Fetch commits from GitHub
  const commits = await fetchUserCommits(user.username, accessToken);

  if (commits.length === 0) {
    console.log(`No commits found for ${user.username}`);
    return;
  }

  // Fetch language data for repos
  const repos = [...new Set(commits.map((c) => c.repo))];
  const repoLanguages = await fetchReposLanguages(repos, accessToken);

  // Parse commits to generate profile summary
  const profile = parseCommits(commits, repoLanguages);

  // Upsert commits
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

  console.log(`Synced ${commits.length} commits for ${user.username}`);
  console.log(`Profile: ${profile.highlights} (activity: ${profile.activityScore})`);
}

/**
 * Recompute profile for a user from existing commits
 */
export async function recomputeProfile(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      commits: {
        orderBy: { date: 'desc' },
        take: 100,
      },
    },
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const commits: Commit[] = user.commits.map((c) => ({
    sha: c.sha,
    message: c.message,
    repo: c.repo,
    date: c.date.toISOString(),
  }));

  const profile = parseCommits(commits);

  await prisma.profile.upsert({
    where: { userId },
    update: {
      commitTraits: profile.commitTraits,
      activityScore: profile.activityScore,
      highlights: profile.highlights,
      // Note: languages not updated without repo data
    },
    create: {
      userId,
      languages: profile.languages,
      commitTraits: profile.commitTraits,
      activityScore: profile.activityScore,
      highlights: profile.highlights,
    },
  });

  console.log(`Recomputed profile for ${user.username}`);
}

/**
 * Sync all users (for batch processing)
 */
export async function syncAllUsers(options: SyncOptions = {}): Promise<void> {
  const users = await prisma.user.findMany({
    where: options.userId ? { id: options.userId } : undefined,
    select: { id: true, username: true },
  });

  console.log(`Processing ${users.length} users...`);

  for (const user of users) {
    try {
      // Note: In production, you'd want to use stored OAuth tokens
      await syncUserCommits(user.id);
    } catch (error) {
      console.error(`Failed to sync ${user.username}:`, error);
    }
  }

  console.log('Sync complete!');
}

/**
 * Clean up old commits (older than 1 year)
 */
export async function cleanupOldData(): Promise<void> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const result = await prisma.commit.deleteMany({
    where: {
      date: { lt: oneYearAgo },
    },
  });

  console.log(`Deleted ${result.count} old commits`);
}

// CLI mode
if (require.main === module) {
  const command = process.argv[2];

  const commands: Record<string, () => Promise<void>> = {
    sync: () => syncAllUsers(),
    cleanup: () => cleanupOldData(),
    help: async () => {
      console.log(`
GitCommit Worker

Commands:
  sync      - Sync commits for all users
  cleanup   - Remove commits older than 1 year
  help      - Show this help message
      `);
    },
  };

  const handler = commands[command] || commands.help;
  
  handler()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

