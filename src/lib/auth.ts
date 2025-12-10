/**
 * NextAuth configuration for GitHub OAuth
 */

import { NextAuthOptions } from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || account.provider !== 'github') {
        return false;
      }

      const githubProfile = profile as {
        login?: string;
        avatar_url?: string;
        bio?: string;
      };

      try {
        // Upsert user in database
        await prisma.user.upsert({
          where: { githubId: String(account.providerAccountId) },
          update: {
            username: githubProfile.login || user.name || 'unknown',
            avatar: githubProfile.avatar_url || user.image,
            bio: githubProfile.bio,
            email: user.email,
          },
          create: {
            githubId: String(account.providerAccountId),
            username: githubProfile.login || user.name || 'unknown',
            avatar: githubProfile.avatar_url || user.image,
            bio: githubProfile.bio,
            email: user.email,
          },
        });

        return true;
      } catch (error) {
        console.error('Error during sign in:', error);
        return false;
      }
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        // Get user from DB to include our custom fields
        const dbUser = await prisma.user.findUnique({
          where: { githubId: token.sub },
          select: { id: true, username: true, avatar: true, isAdmin: true },
        });

        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.username = dbUser.username;
          session.user.isAdmin = dbUser.isAdmin;
        }
        session.user.githubId = token.sub;
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.sub = account.providerAccountId;
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
};

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      githubId: string;
      isAdmin: boolean;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    accessToken: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
  }
}

