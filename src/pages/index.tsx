import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (session?.user) {
      // Check if user needs onboarding (no profile synced yet)
      setShowOnboarding(true);
    }
  }, [session]);

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gc-accent"></div>
        </div>
      </Layout>
    );
  }

  if (session?.user) {
    return (
      <Layout>
        {showOnboarding && (
          <OnboardingModal 
            onClose={() => setShowOnboarding(false)} 
            onComplete={() => {
              setShowOnboarding(false);
              router.push('/discover');
            }}
          />
        )}
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 gradient-text">
              Welcome back, {session.user.username}!
            </h1>
            <p className="text-gc-muted text-lg">
              Ready to find your code soulmate?
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <button
              onClick={() => router.push('/discover')}
              className="card card-hover text-left group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gc-accent/10 flex items-center justify-center group-hover:bg-gc-accent/20 transition-colors">
                  <svg className="w-6 h-6 text-gc-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gc-text">Discover</h2>
                  <p className="text-gc-muted text-sm">Find compatible developers</p>
                </div>
              </div>
              <p className="text-gc-muted">
                Swipe through profiles matched to your coding style and tech stack.
              </p>
            </button>

            <button
              onClick={() => router.push('/matches')}
              className="card card-hover text-left group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gc-green/10 flex items-center justify-center group-hover:bg-gc-green/20 transition-colors">
                  <svg className="w-6 h-6 text-gc-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gc-text">Matches</h2>
                  <p className="text-gc-muted text-sm">View your connections</p>
                </div>
              </div>
              <p className="text-gc-muted">
                Chat with developers who share your coding vibes.
              </p>
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-2xl">
          <div className="mb-8 animate-float">
            <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-gc-accent to-gc-purple flex items-center justify-center">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
          </div>

          <h1 className="text-5xl font-bold mb-4">
            <span className="text-gc-text">Git</span>
            <span className="text-gc-accent">Commit</span>
          </h1>
          
          <p className="text-xl text-gc-muted mb-2">
            Find your code soulmate
          </p>
          
          <p className="text-gc-muted mb-8 max-w-md mx-auto">
            Match with developers based on your commit history, coding style, and tech stack.
            Swipe right on fixer? Left on chaotic? Let your commits do the talking.
          </p>

          <button
            onClick={() => signIn('github')}
            className="btn btn-primary text-lg px-8 py-3 flex items-center gap-3 mx-auto"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Sign in with GitHub
          </button>

          <div className="mt-12 grid grid-cols-3 gap-4 text-center">
            <div className="p-4">
              <div className="text-2xl font-bold text-gc-accent">100+</div>
              <div className="text-sm text-gc-muted">Commits analyzed</div>
            </div>
            <div className="p-4">
              <div className="text-2xl font-bold text-gc-green">6</div>
              <div className="text-sm text-gc-muted">Coding traits</div>
            </div>
            <div className="p-4">
              <div className="text-2xl font-bold text-gc-purple">∞</div>
              <div className="text-sm text-gc-muted">Potential matches</div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function OnboardingModal({ onClose, onComplete }: { onClose: () => void; onComplete: () => void }) {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch('/api/sync', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync');
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync profile');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="card max-w-md w-full animate-fade-in">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gc-accent/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-gc-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gc-text mb-2">Welcome to GitCommit!</h2>
          <p className="text-gc-muted">
            We&apos;ll import your public commits and languages to create your developer profile.
            You can redact specific commits later.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-gc-red/10 border border-gc-red/30 text-gc-red text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            {syncing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gc-darker"></div>
                Syncing commits...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync My Profile
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="btn btn-secondary w-full"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

