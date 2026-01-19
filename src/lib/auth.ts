import NextAuth, { type NextAuthConfig } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import type { TenantRole } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    accessToken?: string;
    error?: string;
    // Multi-tenant context
    tenantId?: string;
    tenantRole?: TenantRole;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    accessToken?: string;
    error?: string;
    // Multi-tenant context (cached)
    tenantId?: string;
    tenantRole?: TenantRole;
  }
}

export const authConfig: NextAuthConfig = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign in
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
        };
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      if (token.sub) {
        session.user.id = token.sub;
      }
      // Include tenant context in session
      session.tenantId = token.tenantId;
      session.tenantRole = token.tenantRole;
      return session;
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

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig);
