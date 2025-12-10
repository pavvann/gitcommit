/**
 * GitHub API client for fetching user commits and repository data
 */

import { Commit, GitHubEvent, GitHubRepo } from '@/types';

const GITHUB_API = 'https://api.github.com';

interface GitHubCommitResponse {
  sha: string;
  commit: {
    message: string;
    author: {
      date: string;
      name: string;
    };
    committer: {
      date: string;
    };
  };
  author: {
    login: string;
  } | null;
}

/**
 * Fetch the last 100 public commits for a user
 * Uses multiple strategies:
 * 1. Events API for push events
 * 2. Direct repo commits as fallback
 */
export async function fetchUserCommits(
  username: string,
  accessToken?: string
): Promise<Commit[]> {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'GitCommit-App',
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let commits: Commit[] = [];

  // Strategy 1: Try Events API first (most recent activity)
  commits = await fetchCommitsFromEvents(username, headers);

  // Strategy 2: If no commits from events, fetch from repos directly
  if (commits.length === 0) {
    console.log(`No push events found for ${username}, fetching from repos...`);
    commits = await fetchCommitsFromRepos(username, headers);
  }

  return commits;
}

/**
 * Fetch commits from push events
 */
async function fetchCommitsFromEvents(
  username: string,
  headers: HeadersInit
): Promise<Commit[]> {
  const commits: Commit[] = [];
  let page = 1;
  const maxPages = 10;

  while (commits.length < 100 && page <= maxPages) {
    const response = await fetch(
      `${GITHUB_API}/users/${username}/events/public?per_page=100&page=${page}`,
      { headers }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`GitHub user not found: ${username}`);
      }
      break;
    }

    const events: GitHubEvent[] = await response.json();
    if (events.length === 0) break;

    for (const event of events) {
      if (event.type === 'PushEvent' && event.payload.commits) {
        for (const commit of event.payload.commits) {
          if (commits.length >= 100) break;
          commits.push({
            sha: commit.sha,
            message: commit.message,
            repo: event.repo.name,
            date: event.created_at,
          });
        }
      }
      if (commits.length >= 100) break;
    }

    page++;
  }

  return commits;
}

/**
 * Fetch commits directly from user's repositories
 */
async function fetchCommitsFromRepos(
  username: string,
  headers: HeadersInit
): Promise<Commit[]> {
  const commits: Commit[] = [];

  // Get user's repos, sorted by most recently pushed
  const reposResponse = await fetch(
    `${GITHUB_API}/users/${username}/repos?per_page=30&sort=pushed&direction=desc`,
    { headers }
  );

  if (!reposResponse.ok) {
    return commits;
  }

  const repos: GitHubRepo[] = await reposResponse.json();

  // Fetch commits from each repo (limit to top 10 repos to avoid rate limits)
  for (const repo of repos.slice(0, 10)) {
    if (commits.length >= 100) break;

    try {
      const commitsResponse = await fetch(
        `${GITHUB_API}/repos/${repo.full_name}/commits?author=${username}&per_page=20`,
        { headers }
      );

      if (!commitsResponse.ok) continue;

      const repoCommits: GitHubCommitResponse[] = await commitsResponse.json();

      for (const commit of repoCommits) {
        if (commits.length >= 100) break;
        
        // Only include commits by this user
        if (commit.author?.login?.toLowerCase() === username.toLowerCase()) {
          commits.push({
            sha: commit.sha,
            message: commit.commit.message.split('\n')[0], // First line only
            repo: repo.full_name,
            date: commit.commit.committer.date,
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching commits from ${repo.full_name}:`, error);
      continue;
    }
  }

  // Sort by date descending
  commits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return commits.slice(0, 100);
}

/**
 * Fetch languages for a repository
 */
export async function fetchRepoLanguages(
  repoFullName: string,
  accessToken?: string
): Promise<Record<string, number>> {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'GitCommit-App',
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(
    `${GITHUB_API}/repos/${repoFullName}/languages`,
    { headers }
  );

  if (!response.ok) {
    return {};
  }

  return response.json();
}

/**
 * Fetch languages for multiple repositories
 */
export async function fetchReposLanguages(
  repos: string[],
  accessToken?: string
): Promise<Record<string, Record<string, number>>> {
  const uniqueRepos = [...new Set(repos)];
  const result: Record<string, Record<string, number>> = {};

  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'GitCommit-App',
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  // Fetch in parallel with rate limiting (max 5 concurrent)
  const batchSize = 5;
  for (let i = 0; i < uniqueRepos.length; i += batchSize) {
    const batch = uniqueRepos.slice(i, i + batchSize);
    const promises = batch.map(async (repo) => {
      try {
        const response = await fetch(
          `${GITHUB_API}/repos/${repo}/languages`,
          { headers }
        );
        if (!response.ok) return { repo, languages: {} };
        const languages = await response.json();
        return { repo, languages };
      } catch {
        return { repo, languages: {} };
      }
    });

    const results = await Promise.all(promises);
    for (const { repo, languages } of results) {
      result[repo] = languages;
    }
  }

  return result;
}

/**
 * Fetch user's public repositories
 */
export async function fetchUserRepos(
  username: string,
  accessToken?: string
): Promise<GitHubRepo[]> {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'GitCommit-App',
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(
    `${GITHUB_API}/users/${username}/repos?per_page=100&sort=pushed`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return response.json();
}
