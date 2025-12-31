// lib/auth.ts

import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

/**
 * NextAuth configuration for Google OAuth
 * 
 * Key configuration:
 * - Scope: drive.file (app-created files only, minimum privilege)
 * - access_type: offline (requests refresh token)
 * - prompt: consent (forces consent screen in dev, ensures refresh_token)
 * 
 * Note: Google only returns refresh_token on FIRST consent.
 * If missing, revoke app access at https://myaccount.google.com/permissions
 * and re-authenticate to trigger fresh consent flow.
 * 
 * For production: Remove 'prompt: consent' to avoid showing consent screen
 * on every login after first authorization.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Persist the OAuth access_token and refresh_token after signin
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Send access_token to the client (needed for Drive API calls)
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
