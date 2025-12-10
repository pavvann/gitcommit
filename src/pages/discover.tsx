import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import Layout from '@/components/Layout';
import { CandidateProfile } from '@/types';

export default function DiscoverPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchModal, setMatchModal] = useState<{ id: string; username: string; score: number } | null>(null);

  const fetchCandidates = useCallback(async () => {
    try {
      const response = await fetch('/api/discover?limit=20');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch candidates');
      }

      setCandidates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchCandidates();
    }
  }, [status, router, fetchCandidates]);

  const handleLike = async (userId: string) => {
    try {
      const response = await fetch('/api/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to like');
      }

      if (data.match) {
        const candidate = candidates[currentIndex];
        setMatchModal({
          id: data.match.id,
          username: candidate.username,
          score: data.match.score,
        });
      }
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    const candidate = candidates[currentIndex];
    if (direction === 'right') {
      handleLike(candidate.userId);
    }
    setCurrentIndex((prev) => prev + 1);
  };

  const currentCandidate = candidates[currentIndex];

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gc-accent"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="card max-w-md text-center">
            <div className="text-gc-red mb-4">{error}</div>
            <button onClick={() => router.push('/')} className="btn btn-secondary">
              Go back
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!currentCandidate) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="card max-w-md text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gc-muted/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-gc-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gc-text mb-2">No more profiles</h2>
            <p className="text-gc-muted mb-4">
              You&apos;ve seen all available developers. Check back later for new matches!
            </p>
            <button onClick={() => fetchCandidates()} className="btn btn-primary">
              Refresh
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-8 px-4">
        <div className="max-w-lg mx-auto">
          <div className="relative h-[600px]">
            <AnimatePresence>
              <SwipeCard
                key={currentCandidate.userId}
                candidate={currentCandidate}
                onSwipe={handleSwipe}
              />
            </AnimatePresence>
          </div>

          <div className="flex justify-center gap-6 mt-6">
            <button
              onClick={() => handleSwipe('left')}
              className="w-16 h-16 rounded-full bg-gc-red/10 border-2 border-gc-red/30 flex items-center justify-center hover:bg-gc-red/20 transition-colors group"
            >
              <svg className="w-8 h-8 text-gc-red group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={() => handleSwipe('right')}
              className="w-16 h-16 rounded-full bg-gc-green/10 border-2 border-gc-green/30 flex items-center justify-center hover:bg-gc-green/20 transition-colors group"
            >
              <svg className="w-8 h-8 text-gc-green group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {matchModal && (
        <MatchModal
          matchId={matchModal.id}
          username={matchModal.username}
          score={matchModal.score}
          onClose={() => setMatchModal(null)}
          onChat={() => router.push(`/matches?chat=${matchModal.id}`)}
        />
      )}
    </Layout>
  );
}

function SwipeCard({
  candidate,
  onSwipe,
}: {
  candidate: CandidateProfile;
  onSwipe: (direction: 'left' | 'right') => void;
}) {
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);

  const handleDragEnd = (_: never, info: PanInfo) => {
    if (info.offset.x > 100) {
      setExitDirection('right');
      setTimeout(() => onSwipe('right'), 200);
    } else if (info.offset.x < -100) {
      setExitDirection('left');
      setTimeout(() => onSwipe('left'), 200);
    }
  };

  const languages = Object.entries(candidate.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const traits = Object.entries(candidate.commitTraits)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{
        x: exitDirection === 'right' ? 300 : exitDirection === 'left' ? -300 : 0,
        opacity: 0,
        rotate: exitDirection === 'right' ? 10 : exitDirection === 'left' ? -10 : 0,
      }}
      transition={{ duration: 0.2 }}
    >
      <div className="card h-full flex flex-col">
        <div className="flex items-center gap-4 mb-4">
          {candidate.avatar ? (
            <img
              src={candidate.avatar}
              alt={candidate.username}
              className="w-16 h-16 rounded-full"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gc-accent/20 flex items-center justify-center text-gc-accent text-2xl font-bold">
              {candidate.username[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gc-text">{candidate.username}</h2>
            <p className="text-gc-muted text-sm">{candidate.highlights}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gc-accent">
              {Math.round(candidate.score * 100)}%
            </div>
            <div className="text-xs text-gc-muted">match</div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto">
          <div>
            <h3 className="text-sm font-medium text-gc-muted mb-2">Languages</h3>
            <div className="flex flex-wrap gap-2">
              {languages.map(([lang, pct]) => (
                <span key={lang} className="badge badge-blue">
                  {lang} {Math.round(pct * 100)}%
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gc-muted mb-2">Commit Vibes</h3>
            <div className="space-y-2">
              {traits.map(([trait, value]) => (
                <div key={trait} className="flex items-center gap-2">
                  <span className="text-sm text-gc-text w-20 capitalize">{trait}</span>
                  <div className="flex-1 h-2 bg-gc-darker rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gc-accent rounded-full"
                      style={{ width: `${value * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gc-muted w-10">
                    {Math.round(value * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {candidate.recentCommits && candidate.recentCommits.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gc-muted mb-2">Recent Commits</h3>
              <div className="space-y-1.5">
                {candidate.recentCommits.map((commit) => (
                  <div key={commit.sha} className="p-2 bg-gc-darker rounded-lg">
                    <p className="text-sm text-gc-text font-mono truncate">
                      {commit.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gc-border text-center text-sm text-gc-muted">
          Swipe right to like, left to skip
        </div>
      </div>
    </motion.div>
  );
}

function MatchModal({
  matchId,
  username,
  score,
  onClose,
  onChat,
}: {
  matchId: string;
  username: string;
  score: number;
  onClose: () => void;
  onChat: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <motion.div
        className="card max-w-md w-full text-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gc-green/20 flex items-center justify-center animate-pulse-glow">
            <svg className="w-10 h-10 text-gc-green" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gc-green mb-2">It&apos;s a Match! 🎉</h2>
          <p className="text-gc-text">
            You and <span className="font-bold">{username}</span> both liked each other!
          </p>
          <p className="text-gc-muted text-sm mt-2">
            {Math.round(score * 100)}% compatibility score
          </p>
        </div>

        <div className="space-y-3">
          <button onClick={onChat} className="btn btn-primary w-full">
            Start Chatting
          </button>
          <button onClick={onClose} className="btn btn-secondary w-full">
            Keep Swiping
          </button>
        </div>
      </motion.div>
    </div>
  );
}

