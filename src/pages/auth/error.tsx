import { useRouter } from 'next/router';
import Layout from '@/components/Layout';

export default function AuthError() {
  const router = useRouter();
  const { error } = router.query;

  const errorMessages: Record<string, { title: string; message: string }> = {
    Configuration: {
      title: 'Server Configuration Error',
      message: 'There is a problem with the server configuration. Please contact support.',
    },
    AccessDenied: {
      title: 'Access Denied',
      message: 'You do not have permission to sign in.',
    },
    Verification: {
      title: 'Verification Error',
      message: 'The verification link may have expired or already been used.',
    },
    Default: {
      title: 'Authentication Error',
      message: 'An error occurred during authentication. Please try again.',
    },
  };

  const errorInfo = errorMessages[error as string] || errorMessages.Default;

  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gc-red/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-gc-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gc-text mb-2">{errorInfo.title}</h1>
          <p className="text-gc-muted mb-6">{errorInfo.message}</p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/auth/signin')}
              className="btn btn-primary w-full"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/')}
              className="btn btn-secondary w-full"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

