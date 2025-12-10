/**
 * Integration tests for the like → match flow
 * 
 * Tests the full workflow of:
 * 1. Two users liking each other
 * 2. Match creation on mutual like
 * 3. Messaging within a match
 * 
 * Note: These tests require a database connection.
 * Set DATABASE_URL environment variable to run these tests.
 * They will be automatically skipped if no database is available.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { parseCommits } from './parser';
import { computeCompatibility } from './matcher';
import { Commit, ProfileSummary } from '@/types';

// Check if database is available
const DATABASE_URL = process.env.DATABASE_URL;
const skipIntegration = !DATABASE_URL;

// Create prisma client only if DATABASE_URL is set
let prisma: PrismaClient;

if (!skipIntegration) {
  prisma = new PrismaClient();
}

describe.skipIf(skipIntegration)('Like → Match Integration Flow', () => {
  let userA: { id: string; username: string };
  let userB: { id: string; username: string };
  let profileA: ProfileSummary;
  let profileB: ProfileSummary;

  beforeAll(async () => {
    // Create test users
    userA = await prisma.user.create({
      data: {
        githubId: 'test_user_a_' + Date.now(),
        username: 'test_alice',
        avatar: null,
      },
    });

    userB = await prisma.user.create({
      data: {
        githubId: 'test_user_b_' + Date.now(),
        username: 'test_bob',
        avatar: null,
      },
    });

    // Create profiles with commits
    const commitsA: Commit[] = [
      { sha: 'test1', message: 'fix: resolve bug', repo: 'test/a', date: new Date().toISOString() },
      { sha: 'test2', message: 'add unit test', repo: 'test/a', date: new Date().toISOString() },
    ];

    const commitsB: Commit[] = [
      { sha: 'test3', message: 'fix: another bug', repo: 'test/b', date: new Date().toISOString() },
      { sha: 'test4', message: 'docs: update readme', repo: 'test/b', date: new Date().toISOString() },
    ];

    profileA = parseCommits(commitsA, {
      'test/a': { TypeScript: 10000, JavaScript: 5000 },
    });

    profileB = parseCommits(commitsB, {
      'test/b': { TypeScript: 8000, Python: 7000 },
    });

    // Store profiles in DB
    await prisma.profile.create({
      data: {
        userId: userA.id,
        languages: profileA.languages,
        commitTraits: profileA.commitTraits,
        activityScore: profileA.activityScore,
        highlights: profileA.highlights,
      },
    });

    await prisma.profile.create({
      data: {
        userId: userB.id,
        languages: profileB.languages,
        commitTraits: profileB.commitTraits,
        activityScore: profileB.activityScore,
        highlights: profileB.highlights,
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.message.deleteMany({
      where: {
        match: {
          OR: [{ userA: userA.id }, { userB: userA.id }],
        },
      },
    });
    await prisma.match.deleteMany({
      where: {
        OR: [{ userA: userA.id }, { userB: userA.id }],
      },
    });
    await prisma.like.deleteMany({
      where: {
        OR: [{ fromUser: userA.id }, { fromUser: userB.id }],
      },
    });
    await prisma.profile.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id] } },
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up likes and matches before each test
    await prisma.message.deleteMany({
      where: {
        match: {
          OR: [{ userA: userA.id }, { userB: userA.id }],
        },
      },
    });
    await prisma.match.deleteMany({
      where: {
        OR: [{ userA: userA.id }, { userB: userA.id }],
      },
    });
    await prisma.like.deleteMany({
      where: {
        OR: [{ fromUser: userA.id }, { fromUser: userB.id }],
      },
    });
  });

  it('should create a like without a match when only one user likes', async () => {
    // User A likes User B
    const like = await prisma.like.create({
      data: {
        fromUser: userA.id,
        toUser: userB.id,
      },
    });

    expect(like).toBeDefined();
    expect(like.fromUser).toBe(userA.id);
    expect(like.toUser).toBe(userB.id);

    // Check no match exists yet
    const match = await prisma.match.findFirst({
      where: {
        OR: [
          { userA: userA.id, userB: userB.id },
          { userA: userB.id, userB: userA.id },
        ],
      },
    });

    expect(match).toBeNull();
  });

  it('should create a match when both users like each other', async () => {
    // User A likes User B
    await prisma.like.create({
      data: {
        fromUser: userA.id,
        toUser: userB.id,
      },
    });

    // User B likes User A (mutual!)
    await prisma.like.create({
      data: {
        fromUser: userB.id,
        toUser: userA.id,
      },
    });

    // Check for mutual like
    const mutualLike = await prisma.like.findUnique({
      where: {
        fromUser_toUser: { fromUser: userB.id, toUser: userA.id },
      },
    });
    expect(mutualLike).toBeDefined();

    // Calculate compatibility score
    const score = computeCompatibility(profileA, profileB);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);

    // Create match (simulating what the API would do)
    const [sortedUserA, sortedUserB] = userA.id < userB.id
      ? [userA.id, userB.id]
      : [userB.id, userA.id];

    const match = await prisma.match.create({
      data: {
        userA: sortedUserA,
        userB: sortedUserB,
        score,
      },
    });

    expect(match).toBeDefined();
    expect(match.score).toBe(score);
    expect([match.userA, match.userB]).toContain(userA.id);
    expect([match.userA, match.userB]).toContain(userB.id);
  });

  it('should allow messaging between matched users', async () => {
    // Create likes and match
    await prisma.like.createMany({
      data: [
        { fromUser: userA.id, toUser: userB.id },
        { fromUser: userB.id, toUser: userA.id },
      ],
    });

    const [sortedUserA, sortedUserB] = userA.id < userB.id
      ? [userA.id, userB.id]
      : [userB.id, userA.id];

    const match = await prisma.match.create({
      data: {
        userA: sortedUserA,
        userB: sortedUserB,
        score: 0.75,
      },
    });

    // User A sends a message
    const message1 = await prisma.message.create({
      data: {
        matchId: match.id,
        fromUser: userA.id,
        body: 'Hey! Nice to match with you!',
      },
    });

    expect(message1).toBeDefined();
    expect(message1.body).toBe('Hey! Nice to match with you!');
    expect(message1.fromUser).toBe(userA.id);

    // User B responds
    const message2 = await prisma.message.create({
      data: {
        matchId: match.id,
        fromUser: userB.id,
        body: 'Thanks! Love your commit style!',
      },
    });

    expect(message2).toBeDefined();
    expect(message2.fromUser).toBe(userB.id);

    // Fetch all messages in the match
    const messages = await prisma.message.findMany({
      where: { matchId: match.id },
      orderBy: { createdAt: 'asc' },
    });

    expect(messages).toHaveLength(2);
    expect(messages[0].body).toBe('Hey! Nice to match with you!');
    expect(messages[1].body).toBe('Thanks! Love your commit style!');
  });

  it('should compute correct compatibility score between test profiles', () => {
    /**
     * Profile A:
     * - Languages: TypeScript (0.6667), JavaScript (0.3333)
     * - Traits: fixer (0.5), tests (0.5)
     * 
     * Profile B:
     * - Languages: TypeScript (0.5333), Python (0.4667)
     * - Traits: fixer (0.5), docs (0.5)
     * 
     * Expected calculations:
     * - Tech overlap: cosine of [0.6667, 0.3333, 0] and [0.5333, 0, 0.4667]
     * - Trait similarity: cosine of [fixer:0.5, tests:0.5] and [fixer:0.5, docs:0.5]
     */
    const score = computeCompatibility(profileA, profileB);

    expect(score).toBeGreaterThan(0.3); // Should have some overlap (both have TypeScript, fixer)
    expect(score).toBeLessThan(0.9); // But not perfect (different secondary langs/traits)
    expect(typeof score).toBe('number');
    
    // Score should be rounded to 4 decimals
    const decimalPlaces = (score.toString().split('.')[1] || '').length;
    expect(decimalPlaces).toBeLessThanOrEqual(4);
  });

  it('should prevent duplicate likes', async () => {
    // First like should succeed
    await prisma.like.create({
      data: {
        fromUser: userA.id,
        toUser: userB.id,
      },
    });

    // Second like should fail due to unique constraint
    await expect(
      prisma.like.create({
        data: {
          fromUser: userA.id,
          toUser: userB.id,
        },
      })
    ).rejects.toThrow();
  });
});
