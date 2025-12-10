import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import Layout from '@/components/Layout';

interface ProfileData {
  id: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  profile: {
    languages: Record<string, number>;
    commitTraits: Record<string, number>;
    activityScore: number;
    highlights: string;
    lastSynced: string | null;
  } | null;
  commits?: Array<{
    sha: string;
    message: string;
    repo: string;
    date: string;
  }>;
  createdAt: string;
}

interface ProfilePageProps {
  profile: ProfileData | null;
  error?: string;
}

export default function ProfilePage({ profile, error }: ProfilePageProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const isOwnProfile = session?.user?.id === profile?.id;

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);

    try {
      const response = await fetch('/api/sync', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync');
      }

      // Refresh the page to show updated data
      router.reload();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Failed to sync profile');
      setSyncing(false);
    }
  };

  if (error || !profile) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="card max-w-md text-center">
            <div className="text-gc-red mb-4">{error || 'Profile not found'}</div>
            <button onClick={() => router.back()} className="btn btn-secondary">
              Go back
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const languages = profile.profile
    ? Object.entries(profile.profile.languages).sort((a, b) => b[1] - a[1])
    : [];

  const traits = profile.profile
    ? Object.entries(profile.profile.commitTraits)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
    : [];

  const hasNoData = !profile.profile || (languages.length === 0 && traits.length === 0);

  return (
    <Layout>
      <div className="py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="card mb-6">
            <div className="flex items-start gap-6">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.username}
                  className="w-24 h-24 rounded-full"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gc-accent/20 flex items-center justify-center text-gc-accent text-4xl font-bold">
                  {profile.username[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gc-text mb-1">{profile.username}</h1>
                {profile.bio && (
                  <p className="text-gc-muted mb-2">{profile.bio}</p>
                )}
                {profile.profile && profile.profile.highlights && (
                  <div className="flex flex-wrap gap-2">
                    {profile.profile.highlights.split(', ').filter(Boolean).map((trait) => (
                      <span key={trait} className="badge badge-purple capitalize">
                        {trait}
                      </span>
                    ))}
                    <span className="badge badge-blue">
                      Activity: {Math.round(profile.profile.activityScore * 100)}%
                    </span>
                  </div>
                )}
                {isOwnProfile && (
                  <div className="mt-4">
                    <button
                      onClick={handleSync}
                      disabled={syncing}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      {syncing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gc-darker"></div>
                          Syncing...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          {hasNoData ? 'Sync My GitHub Profile' : 'Re-sync Profile'}
                        </>
                      )}
                    </button>
                    {syncError && (
                      <p className="text-gc-red text-sm mt-2">{syncError}</p>
                    )}
                    {profile.profile?.lastSynced && (
                      <p className="text-gc-muted text-xs mt-2">
                        Last synced: {new Date(profile.profile.lastSynced).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Show sync prompt if no data and own profile */}
          {hasNoData && isOwnProfile && (
            <div className="card mb-6 text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gc-accent/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-gc-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gc-text mb-2">No profile data yet</h2>
              <p className="text-gc-muted mb-4">
                Click the &quot;Sync My GitHub Profile&quot; button above to import your commits and generate your developer profile.
              </p>
            </div>
          )}

          {profile.profile && !hasNoData && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card">
                <h2 className="text-lg font-semibold text-gc-text mb-4">Languages</h2>
                {languages.length > 0 ? (
                  <div className="space-y-3">
                    {languages.map(([lang, pct]) => (
                      <div key={lang} className="flex items-center gap-3">
                        <span className="text-sm text-gc-text w-24 truncate">{lang}</span>
                        <div className="flex-1 h-2 bg-gc-darker rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gc-accent rounded-full"
                            style={{ width: `${pct * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gc-muted w-12 text-right">
                          {Math.round(pct * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gc-muted">No language data</p>
                )}
              </div>

              <div className="card">
                <h2 className="text-lg font-semibold text-gc-text mb-4">Commit Vibes</h2>
                {traits.length > 0 ? (
                  <div className="space-y-3">
                    {traits.map(([trait, value]) => (
                      <div key={trait} className="flex items-center gap-3">
                        <span className="text-sm text-gc-text w-24 capitalize">{trait}</span>
                        <div className="flex-1 h-2 bg-gc-darker rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getTraitColor(trait)}`}
                            style={{ width: `${value * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gc-muted w-12 text-right">
                          {Math.round(value * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gc-muted">No trait data</p>
                )}
              </div>
            </div>
          )}

          {profile.commits && profile.commits.length > 0 && (
            <div className="card mt-6">
              <h2 className="text-lg font-semibold text-gc-text mb-4">Recent Commits</h2>
              <div className="space-y-3">
                {profile.commits.map((commit) => (
                  <div key={commit.sha} className="p-3 bg-gc-darker rounded-lg">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <code className="text-xs text-gc-accent">{commit.sha.slice(0, 7)}</code>
                      <span className="text-xs text-gc-muted whitespace-nowrap">
                        {new Date(commit.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gc-text font-mono">{commit.message}</p>
                    <p className="text-xs text-gc-muted mt-1">{commit.repo}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function getTraitColor(trait: string): string {
  const colors: Record<string, string> = {
    fixer: 'bg-gc-green',
    tests: 'bg-gc-accent',
    docs: 'bg-gc-purple',
    wip: 'bg-gc-yellow',
    chores: 'bg-gc-muted',
    chaotic: 'bg-gc-red',
  };
  return colors[trait] || 'bg-gc-accent';
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params as { id: string };
  const redact = context.query.redact === 'true';

  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/profile/${id}?redact=${redact}`);
    
    if (!response.ok) {
      return {
        props: {
          profile: null,
          error: 'Profile not found',
        },
      };
    }

    const profile = await response.json();

    return {
      props: {
        profile,
      },
    };
  } catch (error) {
    return {
      props: {
        profile: null,
        error: 'Failed to load profile',
      },
    };
  }
};
