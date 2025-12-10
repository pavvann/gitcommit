import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Image from 'next/image';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <div className="min-h-screen gradient-bg">
      <nav className="border-b border-gc-border bg-gc-darker/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gc-accent to-gc-purple flex items-center justify-center group-hover:scale-105 transition-transform">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <span className="text-xl font-bold">
                <span className="text-gc-text">Git</span>
                <span className="text-gc-accent">Commit</span>
              </span>
            </Link>

            {session?.user && (
              <div className="flex items-center gap-6">
                <NavLink href="/discover" active={router.pathname === '/discover'}>
                  Discover
                </NavLink>
                <NavLink href="/matches" active={router.pathname === '/matches'}>
                  Matches
                </NavLink>
                <div className="flex items-center gap-3">
                  <Link href={`/profile/${session.user.id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    {session.user.image ? (
                      <Image
                        src={session.user.image}
                        alt={session.user.username}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gc-accent/20 flex items-center justify-center text-gc-accent font-medium">
                        {session.user.username[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-gc-text text-sm hidden sm:block">
                      {session.user.username}
                    </span>
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="text-gc-muted hover:text-gc-red transition-colors text-sm"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto">
        {children}
      </main>

      <footer className="border-t border-gc-border mt-auto py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-gc-muted text-sm">
          <p>GitCommit — Find your code soulmate</p>
          <p className="mt-1">Made with ❤️ and too many commits</p>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors ${
        active
          ? 'text-gc-accent'
          : 'text-gc-muted hover:text-gc-text'
      }`}
    >
      {children}
    </Link>
  );
}

