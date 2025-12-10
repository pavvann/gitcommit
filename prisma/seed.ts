/**
 * Database seed script for GitCommit
 * Creates 6 example users with realistic commit data
 */

import { PrismaClient } from '@prisma/client';
import { parseCommits } from '../src/lib/parser';
import { Commit } from '../src/types';

const prisma = new PrismaClient();

interface SeedUser {
  githubId: string;
  username: string;
  avatar: string;
  bio: string;
  commits: Array<{ sha: string; message: string; repo: string; date: string }>;
  repoLanguages: Record<string, Record<string, number>>;
}

// Seed data: 6 users with realistic commits
const seedUsers: SeedUser[] = [
  {
    githubId: '100001',
    username: 'alice_coder',
    avatar: 'https://avatars.githubusercontent.com/u/100001',
    bio: 'Full-stack developer passionate about clean code',
    commits: [
      { sha: 'abc1001', message: 'fix: resolve null pointer exception in auth module', repo: 'alice/webapp', date: '2024-01-10T10:00:00Z' },
      { sha: 'abc1002', message: 'add unit tests for user service', repo: 'alice/webapp', date: '2024-01-09T14:30:00Z' },
      { sha: 'abc1003', message: 'fix: bug in payment processing', repo: 'alice/webapp', date: '2024-01-08T09:15:00Z' },
      { sha: 'abc1004', message: 'update README documentation', repo: 'alice/webapp', date: '2024-01-07T16:00:00Z' },
      { sha: 'abc1005', message: 'chore: bump dependencies to latest', repo: 'alice/webapp', date: '2024-01-06T11:20:00Z' },
      { sha: 'abc1006', message: 'add integration tests for API endpoints', repo: 'alice/api', date: '2024-01-05T13:45:00Z' },
    ],
    repoLanguages: {
      'alice/webapp': { TypeScript: 50000, JavaScript: 20000, CSS: 10000 },
      'alice/api': { TypeScript: 40000, Python: 15000 },
    },
  },
  {
    githubId: '100002',
    username: 'bob_dev',
    avatar: 'https://avatars.githubusercontent.com/u/100002',
    bio: 'Backend engineer, Rust enthusiast',
    commits: [
      { sha: 'bcd2001', message: 'fix: crash on startup when config missing', repo: 'bob/server', date: '2024-01-10T08:00:00Z' },
      { sha: 'bcd2002', message: 'fix: error handling in database connection', repo: 'bob/server', date: '2024-01-09T11:30:00Z' },
      { sha: 'bcd2003', message: 'wip: prototype new caching layer', repo: 'bob/server', date: '2024-01-08T15:00:00Z' },
      { sha: 'bcd2004', message: 'chore: maintenance update for logging', repo: 'bob/server', date: '2024-01-07T10:00:00Z' },
      { sha: 'bcd2005', message: 'fix: panic when parsing invalid JSON', repo: 'bob/parser', date: '2024-01-06T14:20:00Z' },
      { sha: 'bcd2006', message: 'docs: add API documentation comments', repo: 'bob/parser', date: '2024-01-05T09:30:00Z' },
      { sha: 'bcd2007', message: 'bugfix: memory leak in connection pool', repo: 'bob/server', date: '2024-01-04T16:45:00Z' },
    ],
    repoLanguages: {
      'bob/server': { Rust: 60000, Go: 20000 },
      'bob/parser': { Rust: 30000 },
    },
  },
  {
    githubId: '100003',
    username: 'charlie_chaos',
    avatar: 'https://avatars.githubusercontent.com/u/100003',
    bio: 'Move fast and break things',
    commits: [
      { sha: 'cde3001', message: 'finally fixed this shit', repo: 'charlie/hackathon', date: '2024-01-10T03:00:00Z' },
      { sha: 'cde3002', message: 'omg it works lol', repo: 'charlie/hackathon', date: '2024-01-09T23:30:00Z' },
      { sha: 'cde3003', message: 'whew that was close', repo: 'charlie/hackathon', date: '2024-01-08T02:15:00Z' },
      { sha: 'cde3004', message: 'wip: temp fix for demo', repo: 'charlie/hackathon', date: '2024-01-07T22:00:00Z' },
      { sha: 'cde3005', message: 'screw it, shipping anyway', repo: 'charlie/startup', date: '2024-01-06T04:30:00Z' },
      { sha: 'cde3006', message: 'draft: prototype feature', repo: 'charlie/startup', date: '2024-01-05T01:00:00Z' },
    ],
    repoLanguages: {
      'charlie/hackathon': { JavaScript: 40000, Python: 25000 },
      'charlie/startup': { TypeScript: 35000, JavaScript: 15000 },
    },
  },
  {
    githubId: '100004',
    username: 'diana_docs',
    avatar: 'https://avatars.githubusercontent.com/u/100004',
    bio: 'Technical writer turned developer',
    commits: [
      { sha: 'def4001', message: 'update README with setup instructions', repo: 'diana/docs', date: '2024-01-10T14:00:00Z' },
      { sha: 'def4002', message: 'docs: add API reference documentation', repo: 'diana/docs', date: '2024-01-09T10:00:00Z' },
      { sha: 'def4003', message: 'add comments for complex functions', repo: 'diana/library', date: '2024-01-08T12:30:00Z' },
      { sha: 'def4004', message: 'readme: improve quickstart guide', repo: 'diana/library', date: '2024-01-07T15:45:00Z' },
      { sha: 'def4005', message: 'documentation improvements throughout', repo: 'diana/docs', date: '2024-01-06T09:00:00Z' },
    ],
    repoLanguages: {
      'diana/docs': { Markdown: 30000, TypeScript: 10000 },
      'diana/library': { TypeScript: 25000, JavaScript: 5000 },
    },
  },
  {
    githubId: '100005',
    username: 'evan_tests',
    avatar: 'https://avatars.githubusercontent.com/u/100005',
    bio: 'QA engineer who believes in TDD',
    commits: [
      { sha: 'efg5001', message: 'add unit test for authentication flow', repo: 'evan/testing', date: '2024-01-10T11:00:00Z' },
      { sha: 'efg5002', message: 'add integration test for checkout process', repo: 'evan/testing', date: '2024-01-09T16:00:00Z' },
      { sha: 'efg5003', message: 'test: add spec for validation module', repo: 'evan/app', date: '2024-01-08T10:30:00Z' },
      { sha: 'efg5004', message: 'assert: verify edge cases in parser', repo: 'evan/app', date: '2024-01-07T14:00:00Z' },
      { sha: 'efg5005', message: 'add unit tests for error handling', repo: 'evan/testing', date: '2024-01-06T08:45:00Z' },
      { sha: 'efg5006', message: 'test coverage improvements', repo: 'evan/app', date: '2024-01-05T12:00:00Z' },
      { sha: 'efg5007', message: 'fix: test flakiness in CI', repo: 'evan/testing', date: '2024-01-04T17:30:00Z' },
      { sha: 'efg5008', message: 'spec: add E2E tests for user flow', repo: 'evan/testing', date: '2024-01-03T11:00:00Z' },
    ],
    repoLanguages: {
      'evan/testing': { TypeScript: 45000, JavaScript: 25000 },
      'evan/app': { TypeScript: 30000 },
    },
  },
  {
    githubId: '100006',
    username: 'fiona_fullstack',
    avatar: 'https://avatars.githubusercontent.com/u/100006',
    bio: 'Full-stack developer, React & Node.js',
    commits: [
      { sha: 'fgh6001', message: 'fix: resolve login error on mobile', repo: 'fiona/webapp', date: '2024-01-10T09:30:00Z' },
      { sha: 'fgh6002', message: 'add test for new feature', repo: 'fiona/webapp', date: '2024-01-09T13:00:00Z' },
      { sha: 'fgh6003', message: 'chore: deps maintenance', repo: 'fiona/webapp', date: '2024-01-08T11:15:00Z' },
      { sha: 'fgh6004', message: 'update docs for API changes', repo: 'fiona/api', date: '2024-01-07T16:30:00Z' },
      { sha: 'fgh6005', message: 'fix: bug in data validation', repo: 'fiona/api', date: '2024-01-06T10:00:00Z' },
      { sha: 'fgh6006', message: 'wip: new dashboard prototype', repo: 'fiona/webapp', date: '2024-01-05T14:45:00Z' },
    ],
    repoLanguages: {
      'fiona/webapp': { TypeScript: 55000, JavaScript: 20000, CSS: 15000 },
      'fiona/api': { TypeScript: 35000, Python: 10000 },
    },
  },
];

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.message.deleteMany();
  await prisma.match.deleteMany();
  await prisma.like.deleteMany();
  await prisma.commit.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  console.log('✓ Cleared existing data');

  const referenceDate = new Date('2024-01-15T12:00:00Z');

  for (const userData of seedUsers) {
    // Create user
    const user = await prisma.user.create({
      data: {
        githubId: userData.githubId,
        username: userData.username,
        avatar: userData.avatar,
        bio: userData.bio,
      },
    });

    console.log(`✓ Created user: ${user.username}`);

    // Create commits
    for (const commitData of userData.commits) {
      await prisma.commit.create({
        data: {
          userId: user.id,
          sha: commitData.sha,
          message: commitData.message,
          repo: commitData.repo,
          date: new Date(commitData.date),
        },
      });
    }

    console.log(`  ✓ Created ${userData.commits.length} commits`);

    // Parse commits and create profile
    const commits: Commit[] = userData.commits.map((c) => ({
      sha: c.sha,
      message: c.message,
      repo: c.repo,
      date: c.date,
    }));

    const profileSummary = parseCommits(commits, userData.repoLanguages, referenceDate);

    await prisma.profile.create({
      data: {
        userId: user.id,
        languages: profileSummary.languages,
        commitTraits: profileSummary.commitTraits,
        activityScore: profileSummary.activityScore,
        highlights: profileSummary.highlights,
        lastSynced: new Date(),
      },
    });

    console.log(`  ✓ Created profile with highlights: ${profileSummary.highlights}`);
  }

  // Create some sample likes and a match
  const users = await prisma.user.findMany();
  if (users.length >= 2) {
    // Alice likes Bob
    await prisma.like.create({
      data: {
        fromUser: users[0].id,
        toUser: users[1].id,
      },
    });

    // Bob likes Alice (mutual = match!)
    await prisma.like.create({
      data: {
        fromUser: users[1].id,
        toUser: users[0].id,
      },
    });

    // Create the match
    const match = await prisma.match.create({
      data: {
        userA: users[0].id,
        userB: users[1].id,
        score: 0.75,
      },
    });

    // Add some sample messages
    await prisma.message.createMany({
      data: [
        {
          matchId: match.id,
          fromUser: users[0].id,
          body: 'Hey! Love your commit history! 🚀',
        },
        {
          matchId: match.id,
          fromUser: users[1].id,
          body: 'Thanks! Your test coverage is impressive!',
        },
      ],
    });

    console.log('\n✓ Created sample match between alice_coder and bob_dev');
    console.log('✓ Added sample messages');
  }

  console.log('\n🎉 Seed completed successfully!');
  console.log(`\nCreated ${seedUsers.length} users with profiles and commits.`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

