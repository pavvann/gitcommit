import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import Layout from '@/components/Layout';
import { MatchResponse, MessageResponse } from '@/types';

export default function MatchesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [matches, setMatches] = useState<MatchResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    try {
      const response = await fetch('/api/matches');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch matches');
      }

      setMatches(data.matches);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchMatches();
    }
  }, [status, router, fetchMatches]);

  useEffect(() => {
    // Open chat from URL param
    const chatId = router.query.chat as string;
    if (chatId) {
      setSelectedMatch(chatId);
    }
  }, [router.query.chat]);

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
            <button onClick={fetchMatches} className="btn btn-primary">
              Try again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gc-text mb-6">Your Matches</h1>

          {matches.length === 0 ? (
            <div className="card text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gc-muted/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-gc-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gc-text mb-2">No matches yet</h2>
              <p className="text-gc-muted mb-4">
                Start swiping to find your code soulmate!
              </p>
              <button
                onClick={() => router.push('/discover')}
                className="btn btn-primary"
              >
                Discover Developers
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                {matches.map((match) => (
                  <button
                    key={match.id}
                    onClick={() => setSelectedMatch(match.id)}
                    className={`card card-hover w-full text-left ${
                      selectedMatch === match.id ? 'border-gc-accent' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {match.otherUser.avatar ? (
                        <img
                          src={match.otherUser.avatar}
                          alt={match.otherUser.username}
                          className="w-12 h-12 rounded-full"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gc-accent/20 flex items-center justify-center text-gc-accent font-bold">
                          {match.otherUser.username[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gc-text">
                          {match.otherUser.username}
                        </h3>
                        <p className="text-sm text-gc-muted">
                          {Math.round(match.score * 100)}% compatible
                        </p>
                      </div>
                      <div className="text-xs text-gc-muted">
                        {new Date(match.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="hidden md:block">
                {selectedMatch ? (
                  <ChatPanel
                    matchId={selectedMatch}
                    userId={session?.user?.id || ''}
                    matches={matches}
                  />
                ) : (
                  <div className="card h-96 flex items-center justify-center text-gc-muted">
                    Select a match to start chatting
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile chat modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-gc-darker z-50 md:hidden">
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-4 p-4 border-b border-gc-border">
              <button
                onClick={() => setSelectedMatch(null)}
                className="text-gc-muted hover:text-gc-text"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="font-semibold text-gc-text">Chat</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatPanel
                matchId={selectedMatch}
                userId={session?.user?.id || ''}
                matches={matches}
              />
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function ChatPanel({
  matchId,
  userId,
  matches,
}: {
  matchId: string;
  userId: string;
  matches: MatchResponse[];
}) {
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const match = matches.find((m) => m.id === matchId);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/messages/${matchId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch messages');
      }

      setMessages(data.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [matchId, fetchMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, body: newMessage.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setNewMessage('');
      fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="card h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gc-accent"></div>
      </div>
    );
  }

  return (
    <div className="card h-full md:h-[500px] flex flex-col">
      {match && (
        <div className="flex items-center gap-3 pb-4 border-b border-gc-border">
          {match.otherUser.avatar ? (
            <img
              src={match.otherUser.avatar}
              alt={match.otherUser.username}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gc-accent/20 flex items-center justify-center text-gc-accent font-bold">
              {match.otherUser.username[0].toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gc-text">{match.otherUser.username}</h3>
            <p className="text-xs text-gc-muted">{Math.round(match.score * 100)}% match</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gc-muted py-8">
            <p>No messages yet.</p>
            <p className="text-sm">Say hello! 👋</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.fromUser === userId ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                  message.fromUser === userId
                    ? 'bg-gc-accent text-gc-darker rounded-br-sm'
                    : 'bg-gc-dark text-gc-text rounded-bl-sm'
                }`}
              >
                <p className="text-sm">{message.body}</p>
                <p className={`text-xs mt-1 ${
                  message.fromUser === userId ? 'text-gc-darker/60' : 'text-gc-muted'
                }`}>
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {error && (
        <div className="text-gc-red text-sm py-2">{error}</div>
      )}

      <form onSubmit={handleSend} className="pt-4 border-t border-gc-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="input flex-1"
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="btn btn-primary"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-gc-darker"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

