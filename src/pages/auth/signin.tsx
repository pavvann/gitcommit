import { signIn, getProviders } from 'next-auth/react';
import { GetServerSideProps } from 'next';
import Layout from '@/components/Layout';

interface SignInProps {
  providers: Awaited<ReturnType<typeof getProviders>>;
  callbackUrl?: string;
  error?: string;
}

export default function SignIn({ providers, callbackUrl, error }: SignInProps) {
  const errorMessages: Record<string, string> = {
    OAuthSignin: 'Error starting sign in process',
    OAuthCallback: 'Error completing sign in',
    OAuthCreateAccount: 'Could not create account',
    EmailCreateAccount: 'Could not create account',
    Callback: 'Error in callback',
    OAuthAccountNotLinked: 'Email already linked to another account',
    SessionRequired: 'Please sign in to continue',
    Default: 'Unable to sign in',
  };

  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="card max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gc-accent to-gc-purple flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gc-text mb-2">Sign in to GitCommit</h1>
            <p className="text-gc-muted">Find your code soulmate</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-gc-red/10 border border-gc-red/30 text-gc-red text-sm text-center">
              {errorMessages[error] || errorMessages.Default}
            </div>
          )}

          <div className="space-y-3">
            {providers &&
              Object.values(providers).map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => signIn(provider.id, { callbackUrl: callbackUrl || '/' })}
                  className="btn btn-primary w-full flex items-center justify-center gap-3"
                >
                  {provider.id === 'github' && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  )}
                  Sign in with {provider.name}
                </button>
              ))}
          </div>

          <p className="mt-6 text-xs text-gc-muted text-center">
            By signing in, you agree to let us analyze your public GitHub commits.
          </p>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const providers = await getProviders();

  return {
    props: {
      providers,
      callbackUrl: context.query.callbackUrl || null,
      error: context.query.error || null,
    },
  };
};

