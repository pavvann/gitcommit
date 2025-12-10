/**
 * Core type definitions for GitCommit
 */

// Raw commit data from GitHub API
export interface Commit {
  sha: string;
  message: string;
  repo: string;
  date: string; // ISO date string
}

// Parsed profile summary from commits
export interface ProfileSummary {
  languages: Record<string, number>; // Normalized language distribution (sum = 1)
  commitTraits: Record<string, number>; // Normalized trait scores (0..1 each)
  activityScore: number; // 0..1 based on recent commit activity
  highlights: string; // Top two trait names, comma-separated
  timezoneOffset?: number; // Optional timezone offset in hours
}

// Candidate profile for discover endpoint
export interface CandidateProfile {
  userId: string;
  username: string;
  avatar: string | null;
  score: number; // Compatibility score 0..1
  highlights: string;
  commitTraits: Record<string, number>;
  languages: Record<string, number>;
  lastCommitSnippet?: string;
}

// Match response
export interface MatchResponse {
  id: string;
  userId: string;
  otherUser: {
    id: string;
    username: string;
    avatar: string | null;
  };
  score: number;
  createdAt: string;
}

// Message response
export interface MessageResponse {
  id: string;
  matchId: string;
  fromUser: string;
  body: string;
  createdAt: string;
}

// API Response types
export interface SyncResponse {
  ok: boolean;
  profile: ProfileSummary;
}

export interface LikeResponse {
  ok: boolean;
  match?: {
    id: string;
    userA: string;
    userB: string;
    score: number;
  };
}

export interface MatchesResponse {
  matches: MatchResponse[];
}

export interface MessageSendResponse {
  ok: boolean;
  messageId: string;
}

// GitHub API types
export interface GitHubEvent {
  type: string;
  repo: {
    name: string;
  };
  payload: {
    commits?: Array<{
      sha: string;
      message: string;
    }>;
  };
  created_at: string;
}

export interface GitHubRepo {
  name: string;
  full_name: string;
  language: string | null;
  languages_url: string;
}

// Trait keywords for commit parsing
export const TRAIT_KEYWORDS: Record<string, RegExp> = {
  fixer: /fix|bug|panic|crash|nullpointer|error|bugfix/i,
  tests: /test|spec|assert|integration test|unit test/i,
  docs: /readme|docs?|comment/i,
  wip: /wip|temp|prototype|draft/i,
  chores: /chore|bump|deps|maintenance/i,
  chaotic: /fuck|shit|finally|lol|omg|whew|screw/i,
};

// Rate limit constants
export const RATE_LIMITS = {
  LIKES_PER_DAY: 60,
  MESSAGES_PER_DAY: 200,
};

// Spam filter pattern
export const SPAM_PATTERN = /(http|https):\/\/\S+/;

