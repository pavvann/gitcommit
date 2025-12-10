/**
 * Commit Parser - Analyzes GitHub commits to generate user profile summaries
 * 
 * This module implements deterministic parsing rules as specified:
 * - Trait detection via keyword matching
 * - Language aggregation from repo data
 * - Activity scoring based on recency
 */

import { Commit, ProfileSummary, TRAIT_KEYWORDS } from '@/types';

/**
 * Round a number to 4 decimal places
 */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Calculate days since a given date
 */
function daysSince(dateStr: string, now: Date = new Date()): number {
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  return diffMs / (1000 * 60 * 60 * 24);
}

/**
 * Parse commits to generate a ProfileSummary
 * 
 * @param commits - Array of commits to analyze
 * @param repoLanguages - Optional map of repo -> { language: bytes }
 * @param referenceDate - Optional reference date for activity calculation (for testing)
 * @returns ProfileSummary with languages, traits, activity score, and highlights
 */
export function parseCommits(
  commits: Commit[],
  repoLanguages?: Record<string, Record<string, number>>,
  referenceDate?: Date
): ProfileSummary {
  const now = referenceDate || new Date();
  
  if (commits.length === 0) {
    return {
      languages: {},
      commitTraits: {},
      activityScore: 0,
      highlights: '',
    };
  }

  // Count raw trait occurrences
  const traitCounts: Record<string, number> = {
    fixer: 0,
    tests: 0,
    docs: 0,
    wip: 0,
    chores: 0,
    chaotic: 0,
  };

  // Process each commit for traits
  for (const commit of commits) {
    const message = commit.message.toLowerCase();
    for (const [trait, pattern] of Object.entries(TRAIT_KEYWORDS)) {
      if (pattern.test(message)) {
        traitCounts[trait]++;
      }
    }
  }

  // Normalize traits: raw_count / total_commits
  const totalCommits = commits.length;
  const commitTraits: Record<string, number> = {};
  for (const [trait, count] of Object.entries(traitCounts)) {
    commitTraits[trait] = round4(count / totalCommits);
  }

  // Calculate languages from repoLanguages
  const languages: Record<string, number> = {};
  if (repoLanguages) {
    const langTotals: Record<string, number> = {};
    let grandTotal = 0;

    // Aggregate bytes per language across all repos the user has committed to
    const userRepos = new Set(commits.map(c => c.repo));
    for (const repo of userRepos) {
      const repoLangs = repoLanguages[repo];
      if (repoLangs) {
        for (const [lang, bytes] of Object.entries(repoLangs)) {
          langTotals[lang] = (langTotals[lang] || 0) + bytes;
          grandTotal += bytes;
        }
      }
    }

    // Normalize to sum = 1
    if (grandTotal > 0) {
      for (const [lang, bytes] of Object.entries(langTotals)) {
        languages[lang] = round4(bytes / grandTotal);
      }
    }
  }

  // Calculate activity score
  // weight = exp(-days_since / 30) for each commit
  // raw = sum(weights) / min(100, commits_count)
  // Normalize by dividing by 1.0 and clamp to [0,1]
  let weightSum = 0;
  for (const commit of commits) {
    const days = daysSince(commit.date, now);
    const weight = Math.exp(-days / 30);
    weightSum += weight;
  }
  const divisor = Math.min(100, commits.length);
  const rawActivity = weightSum / divisor;
  const activityScore = round4(Math.min(1, Math.max(0, rawActivity)));

  // Determine highlights: top two traits by normalized value
  // Tie-break: alphabetical order
  const traitEntries = Object.entries(commitTraits)
    .filter(([_, value]) => value > 0)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]; // Descending by value
      return a[0].localeCompare(b[0]); // Ascending alphabetical tie-break
    });

  const highlights = traitEntries.slice(0, 2).map(([trait]) => trait).join(', ');

  return {
    languages,
    commitTraits,
    activityScore,
    highlights,
  };
}

