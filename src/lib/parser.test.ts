/**
 * Unit tests for parseCommits function
 * Tests exact numeric outputs per the deterministic spec
 */

import { describe, it, expect } from 'vitest';
import { parseCommits } from './parser';
import { Commit } from '@/types';

describe('parseCommits', () => {
  // Fixed reference date for deterministic testing
  const referenceDate = new Date('2024-01-15T12:00:00Z');

  it('should return empty profile for empty commits array', () => {
    const result = parseCommits([], undefined, referenceDate);
    expect(result).toEqual({
      languages: {},
      commitTraits: {},
      activityScore: 0,
      highlights: '',
    });
  });

  it('should correctly calculate trait scores and highlights', () => {
    // Test commits with specific trait keywords
    const commits: Commit[] = [
      { sha: 'a1', message: 'fix: resolve null pointer bug', repo: 'test/repo', date: '2024-01-14T10:00:00Z' },
      { sha: 'a2', message: 'fix: crash on login', repo: 'test/repo', date: '2024-01-13T10:00:00Z' },
      { sha: 'a3', message: 'add unit test for parser', repo: 'test/repo', date: '2024-01-12T10:00:00Z' },
      { sha: 'a4', message: 'update README docs', repo: 'test/repo', date: '2024-01-11T10:00:00Z' },
      { sha: 'a5', message: 'chore: bump dependencies', repo: 'test/repo', date: '2024-01-10T10:00:00Z' },
    ];

    const result = parseCommits(commits, undefined, referenceDate);

    // Expected trait counts: fixer=2, tests=1, docs=1, chores=1, wip=0, chaotic=0
    // Normalized: 2/5=0.4, 1/5=0.2, 1/5=0.2, 1/5=0.2, 0, 0
    expect(result.commitTraits.fixer).toBe(0.4);
    expect(result.commitTraits.tests).toBe(0.2);
    expect(result.commitTraits.docs).toBe(0.2);
    expect(result.commitTraits.chores).toBe(0.2);
    expect(result.commitTraits.wip).toBe(0);
    expect(result.commitTraits.chaotic).toBe(0);

    // Highlights should be top 2 by value, alphabetical tie-break
    // fixer (0.4) is top, then chores, docs, tests all at 0.2
    // Alphabetical tie-break: chores < docs < tests
    expect(result.highlights).toBe('fixer, chores');
  });

  it('should correctly calculate activity score based on recency', () => {
    // All commits on the reference date (0 days ago)
    // weight = exp(-0/30) = 1 for each
    // sum = 5, divisor = min(100, 5) = 5
    // raw = 5/5 = 1, clamped = 1
    const freshCommits: Commit[] = [
      { sha: 'b1', message: 'commit 1', repo: 'test/repo', date: '2024-01-15T12:00:00Z' },
      { sha: 'b2', message: 'commit 2', repo: 'test/repo', date: '2024-01-15T12:00:00Z' },
      { sha: 'b3', message: 'commit 3', repo: 'test/repo', date: '2024-01-15T12:00:00Z' },
      { sha: 'b4', message: 'commit 4', repo: 'test/repo', date: '2024-01-15T12:00:00Z' },
      { sha: 'b5', message: 'commit 5', repo: 'test/repo', date: '2024-01-15T12:00:00Z' },
    ];

    const freshResult = parseCommits(freshCommits, undefined, referenceDate);
    expect(freshResult.activityScore).toBe(1);

    // Commits 30 days ago
    // weight = exp(-30/30) = exp(-1) ≈ 0.3679
    // sum ≈ 1.8394, divisor = 5
    // raw ≈ 0.3679, rounded to 4 decimals
    const oldCommits: Commit[] = [
      { sha: 'c1', message: 'old commit 1', repo: 'test/repo', date: '2023-12-16T12:00:00Z' },
      { sha: 'c2', message: 'old commit 2', repo: 'test/repo', date: '2023-12-16T12:00:00Z' },
      { sha: 'c3', message: 'old commit 3', repo: 'test/repo', date: '2023-12-16T12:00:00Z' },
      { sha: 'c4', message: 'old commit 4', repo: 'test/repo', date: '2023-12-16T12:00:00Z' },
      { sha: 'c5', message: 'old commit 5', repo: 'test/repo', date: '2023-12-16T12:00:00Z' },
    ];

    const oldResult = parseCommits(oldCommits, undefined, referenceDate);
    // exp(-30/30) = 0.36787944... * 5 = 1.8394 / 5 = 0.3679 rounded
    expect(oldResult.activityScore).toBe(0.3679);
  });

  it('should correctly aggregate and normalize languages from repoLanguages', () => {
    const commits: Commit[] = [
      { sha: 'd1', message: 'commit to repo1', repo: 'user/repo1', date: '2024-01-15T12:00:00Z' },
      { sha: 'd2', message: 'commit to repo2', repo: 'user/repo2', date: '2024-01-14T12:00:00Z' },
    ];

    const repoLanguages: Record<string, Record<string, number>> = {
      'user/repo1': { TypeScript: 8000, JavaScript: 2000 },
      'user/repo2': { TypeScript: 5000, Python: 5000 },
    };

    const result = parseCommits(commits, repoLanguages, referenceDate);

    // Total bytes:
    // TypeScript: 8000 + 5000 = 13000
    // JavaScript: 2000
    // Python: 5000
    // Grand total: 20000
    // Normalized: TS=0.65, JS=0.1, Python=0.25
    expect(result.languages.TypeScript).toBe(0.65);
    expect(result.languages.JavaScript).toBe(0.1);
    expect(result.languages.Python).toBe(0.25);
  });

  it('should handle commits matching multiple traits', () => {
    // A commit that matches both fixer and tests
    const commits: Commit[] = [
      { sha: 'e1', message: 'fix: add test for bug fix', repo: 'test/repo', date: '2024-01-15T12:00:00Z' },
      { sha: 'e2', message: 'normal commit', repo: 'test/repo', date: '2024-01-15T12:00:00Z' },
    ];

    const result = parseCommits(commits, undefined, referenceDate);

    // First commit matches fixer (fix, bug) and tests (test)
    // fixer: 1/2 = 0.5, tests: 1/2 = 0.5
    expect(result.commitTraits.fixer).toBe(0.5);
    expect(result.commitTraits.tests).toBe(0.5);
    // Alphabetical tie-break: fixer < tests
    expect(result.highlights).toBe('fixer, tests');
  });

  it('should handle chaotic trait detection', () => {
    const commits: Commit[] = [
      { sha: 'f1', message: 'finally fixed this shit', repo: 'test/repo', date: '2024-01-15T12:00:00Z' },
      { sha: 'f2', message: 'omg it works lol', repo: 'test/repo', date: '2024-01-15T12:00:00Z' },
      { sha: 'f3', message: 'clean refactor', repo: 'test/repo', date: '2024-01-15T12:00:00Z' },
    ];

    const result = parseCommits(commits, undefined, referenceDate);

    // First commit: chaotic (finally, shit) and fixer (fixed)
    // Second commit: chaotic (omg, lol)
    // Third commit: no traits
    // chaotic: 2/3 = 0.6667, fixer: 1/3 = 0.3333
    expect(result.commitTraits.chaotic).toBe(0.6667);
    expect(result.commitTraits.fixer).toBe(0.3333);
    expect(result.highlights).toBe('chaotic, fixer');
  });
});

