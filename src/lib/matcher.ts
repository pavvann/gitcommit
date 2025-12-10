/**
 * Compatibility Matcher - Computes compatibility scores between user profiles
 * 
 * Algorithm:
 * - Tech overlap (T): cosine similarity of languages vectors
 * - Trait similarity (R): cosine similarity of commitTraits vectors
 * - Activity similarity (A): 1 - |a.activityScore - b.activityScore|
 * - Timezone score (L): if both have offset, max(0, 1 - |delta|/12), else 0.5
 * 
 * Final = 0.4*T + 0.3*R + 0.2*A + 0.1*L
 */

import { ProfileSummary } from '@/types';

/**
 * Round to 4 decimal places
 */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Compute cosine similarity between two sparse vectors represented as Records
 * Missing keys are treated as 0
 * 
 * cosine_sim = (A · B) / (||A|| * ||B||)
 * Returns 0 if either vector is zero-length
 */
function cosineSimilarity(
  a: Record<string, number>,
  b: Record<string, number>
): number {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const key of allKeys) {
    const valA = a[key] || 0;
    const valB = b[key] || 0;
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

/**
 * Compute compatibility score between two user profiles
 * 
 * @param a - First user's profile summary
 * @param b - Second user's profile summary
 * @returns Compatibility score from 0 to 1, rounded to 4 decimals
 */
export function computeCompatibility(
  a: ProfileSummary,
  b: ProfileSummary
): number {
  // Tech overlap: cosine similarity of language vectors
  const techOverlap = cosineSimilarity(a.languages, b.languages);

  // Trait similarity: cosine similarity of commitTraits vectors
  const traitSimilarity = cosineSimilarity(a.commitTraits, b.commitTraits);

  // Activity similarity: 1 - |difference|
  const activitySimilarity = 1 - Math.abs(a.activityScore - b.activityScore);

  // Timezone score
  let timezoneScore: number;
  if (
    a.timezoneOffset !== undefined &&
    b.timezoneOffset !== undefined
  ) {
    const deltaHours = Math.abs(a.timezoneOffset - b.timezoneOffset);
    timezoneScore = Math.max(0, 1 - deltaHours / 12);
  } else {
    timezoneScore = 0.5;
  }

  // Weighted combination
  // Weights: tech=0.4, traits=0.3, activity=0.2, timezone=0.1
  const score =
    0.4 * techOverlap +
    0.3 * traitSimilarity +
    0.2 * activitySimilarity +
    0.1 * timezoneScore;

  return round4(score);
}

