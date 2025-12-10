/**
 * Unit tests for computeCompatibility function
 * Tests exact numeric outputs per the deterministic spec
 * 
 * Algorithm recap:
 * - T = cosine similarity of languages (weight 0.4)
 * - R = cosine similarity of traits (weight 0.3)
 * - A = 1 - |activityScore difference| (weight 0.2)
 * - L = timezone score (weight 0.1)
 * - Final = 0.4*T + 0.3*R + 0.2*A + 0.1*L
 */

import { describe, it, expect } from 'vitest';
import { computeCompatibility } from './matcher';
import { ProfileSummary } from '@/types';

describe('computeCompatibility', () => {
  it('should return perfect score for identical profiles', () => {
    /**
     * Calculation for identical profiles:
     * - T = cosine(identical) = 1.0
     * - R = cosine(identical) = 1.0
     * - A = 1 - |0.8 - 0.8| = 1.0
     * - L = no timezone provided = 0.5
     * 
     * Final = 0.4*1 + 0.3*1 + 0.2*1 + 0.1*0.5
     *       = 0.4 + 0.3 + 0.2 + 0.05
     *       = 0.95
     */
    const profile: ProfileSummary = {
      languages: { TypeScript: 0.6, Python: 0.4 },
      commitTraits: { fixer: 0.5, tests: 0.3, docs: 0.2 },
      activityScore: 0.8,
      highlights: 'fixer, tests',
    };

    const score = computeCompatibility(profile, profile);
    expect(score).toBe(0.95);
  });

  it('should handle completely different profiles with no overlap', () => {
    /**
     * Profile A: JavaScript dev, docs-focused, high activity
     * Profile B: Rust dev, fixer-focused, low activity
     * 
     * Calculation:
     * - T = cosine({JS:1}, {Rust:1}) = 0 (no overlap)
     * - R = cosine({docs:1}, {fixer:1}) = 0 (no overlap)
     * - A = 1 - |0.9 - 0.2| = 1 - 0.7 = 0.3
     * - L = no timezone = 0.5
     * 
     * Final = 0.4*0 + 0.3*0 + 0.2*0.3 + 0.1*0.5
     *       = 0 + 0 + 0.06 + 0.05
     *       = 0.11
     */
    const profileA: ProfileSummary = {
      languages: { JavaScript: 1 },
      commitTraits: { docs: 1, fixer: 0, tests: 0, wip: 0, chores: 0, chaotic: 0 },
      activityScore: 0.9,
      highlights: 'docs',
    };

    const profileB: ProfileSummary = {
      languages: { Rust: 1 },
      commitTraits: { fixer: 1, docs: 0, tests: 0, wip: 0, chores: 0, chaotic: 0 },
      activityScore: 0.2,
      highlights: 'fixer',
    };

    const score = computeCompatibility(profileA, profileB);
    expect(score).toBe(0.11);
  });

  it('should correctly calculate partial overlap with timezone consideration', () => {
    /**
     * Profile A: TypeScript/Python dev (70/30), fixer/tests (60/40), activity 0.7, UTC+0
     * Profile B: TypeScript/Go dev (50/50), fixer/docs (40/60), activity 0.5, UTC+3
     * 
     * Language cosine calculation:
     * A: TS=0.7, Py=0.3, Go=0
     * B: TS=0.5, Py=0, Go=0.5
     * dot = 0.7*0.5 + 0.3*0 + 0*0.5 = 0.35
     * |A| = sqrt(0.49 + 0.09) = sqrt(0.58) ≈ 0.7616
     * |B| = sqrt(0.25 + 0.25) = sqrt(0.5) ≈ 0.7071
     * T = 0.35 / (0.7616 * 0.7071) ≈ 0.35 / 0.5385 ≈ 0.6499
     * 
     * Trait cosine calculation:
     * A: fixer=0.6, tests=0.4, docs=0
     * B: fixer=0.4, docs=0.6, tests=0
     * dot = 0.6*0.4 + 0.4*0 + 0*0.6 = 0.24
     * |A| = sqrt(0.36 + 0.16) = sqrt(0.52) ≈ 0.7211
     * |B| = sqrt(0.16 + 0.36) = sqrt(0.52) ≈ 0.7211
     * R = 0.24 / (0.7211 * 0.7211) ≈ 0.24 / 0.52 ≈ 0.4615
     * 
     * Activity: A = 1 - |0.7 - 0.5| = 0.8
     * 
     * Timezone: L = max(0, 1 - |0 - 3|/12) = max(0, 1 - 0.25) = 0.75
     * 
     * Final = 0.4*0.6499 + 0.3*0.4615 + 0.2*0.8 + 0.1*0.75
     *       ≈ 0.25996 + 0.13845 + 0.16 + 0.075
     *       ≈ 0.6334
     */
    const profileA: ProfileSummary = {
      languages: { TypeScript: 0.7, Python: 0.3 },
      commitTraits: { fixer: 0.6, tests: 0.4, docs: 0, wip: 0, chores: 0, chaotic: 0 },
      activityScore: 0.7,
      highlights: 'fixer, tests',
      timezoneOffset: 0,
    };

    const profileB: ProfileSummary = {
      languages: { TypeScript: 0.5, Go: 0.5 },
      commitTraits: { fixer: 0.4, docs: 0.6, tests: 0, wip: 0, chores: 0, chaotic: 0 },
      activityScore: 0.5,
      highlights: 'docs, fixer',
      timezoneOffset: 3,
    };

    const score = computeCompatibility(profileA, profileB);
    // Due to rounding at each step, exact value may vary slightly
    // Expected approximately 0.6334
    expect(score).toBe(0.6334);
  });

  it('should handle empty profiles gracefully', () => {
    /**
     * Empty profiles should yield:
     * - T = 0 (no languages)
     * - R = 0 (no traits)
     * - A = 1 - |0 - 0| = 1
     * - L = 0.5 (no timezone)
     * 
     * Final = 0.4*0 + 0.3*0 + 0.2*1 + 0.1*0.5
     *       = 0 + 0 + 0.2 + 0.05
     *       = 0.25
     */
    const emptyProfile: ProfileSummary = {
      languages: {},
      commitTraits: {},
      activityScore: 0,
      highlights: '',
    };

    const score = computeCompatibility(emptyProfile, emptyProfile);
    expect(score).toBe(0.25);
  });

  it('should penalize large timezone differences', () => {
    /**
     * Same profiles but with 12-hour timezone difference
     * 
     * Using identical language/trait profiles:
     * - T = 1.0
     * - R = 1.0
     * - A = 1.0
     * - L = max(0, 1 - 12/12) = max(0, 0) = 0
     * 
     * Final = 0.4*1 + 0.3*1 + 0.2*1 + 0.1*0
     *       = 0.4 + 0.3 + 0.2 + 0
     *       = 0.9
     */
    const profileA: ProfileSummary = {
      languages: { TypeScript: 1 },
      commitTraits: { fixer: 1 },
      activityScore: 0.5,
      highlights: 'fixer',
      timezoneOffset: -6,
    };

    const profileB: ProfileSummary = {
      languages: { TypeScript: 1 },
      commitTraits: { fixer: 1 },
      activityScore: 0.5,
      highlights: 'fixer',
      timezoneOffset: 6,
    };

    const score = computeCompatibility(profileA, profileB);
    expect(score).toBe(0.9);
  });
});

