// lib/auth.ts

import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

/**
 * NextAuth configuration for Google OAuth + automatic token refresh.
 *
 * Why you were seeing 401s:
 * - Google access tokens expire (often ~1 hour).
 * - Without refresh, Drive calls fail until you sign out/in again.
 *
 * This config:
 * - Requests offline access (refresh token) + drive.file scope.
 * - Stores access token + refresh token + expiry in JWT.
 * - Automatically refreshes the access token when expired.
 *
 * Notes:
 * - Google often only returns refresh_token on FIRST consent.
 *   If refreshToken is missing, revoke app access at:
 *   https://myaccount.google.com/permissions
 *   then sign in again (prompt=consent forces re-consent in dev).
 * - For production: you can remove `prompt: "consent"` once you’ve
 *   confirmed you captured a refresh token.
 */

type JWTWithGoogle = {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number; // epoch ms
  error?: "NoRefreshToken" | "RefreshAccessTokenError";
  // Keep any other NextAuth JWT fields intact
  [key: string]: any;
};

async function refreshGoogleAccessToken(token: JWTWithGoogle): Promise<JWTWithGoogle> {
  if (!token.refreshToken) {
    return { ...token, error: "NoRefreshToken" };
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
    }),
  });

  const refreshed = await res.json();

  if (!res.ok) {
    // Keep old tokens so app can decide what to do (e.g., force re-auth)
    return { ...token, error: "RefreshAccessTokenError", refreshError: refreshed };
  }

  return {
    ...token,
    accessToken: refreshed.access_token,
    // expires_in is seconds from now
    accessTokenExpires: Date.now() + Number(refreshed.expires_in) * 1000,
    // Google usually does not return a new refresh_token here
    refreshToken: refreshed.refresh_token ?? token.refreshToken,
    error: undefined,
  };
}

export const authOptions: NextAuthOptions = {
  session: {
    // Required for storing tokens in the JWT and refreshing server-side
    strategy: "jwt",
  },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/drive.file",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],

  callbacks: {
    async jwt({ token, account }) {
      const t = token as JWTWithGoogle;

      // 1) Initial sign-in: store tokens + expiry from Google
      if (account) {
        console.log("Google account scope:", (account as any).scope);
        console.log("Has access token?", Boolean(account.access_token));
        console.log("Has refresh token?", Boolean(account.refresh_token));
        console.log("Token expires_at:", (account as any).expires_at);

        // account.expires_at is seconds since epoch (provider-dependent)
        const expiresAtMs =
          typeof account.expires_at === "number"
            ? account.expires_at * 1000
            : Date.now() + 60 * 60 * 1000; // fallback 1 hour

        return {
          ...t,
          accessToken: account.access_token,
          accessTokenExpires: expiresAtMs,
          // Only reliably present on first consent for Google
          refreshToken: account.refresh_token ?? t.refreshToken,
          error: undefined,
        };
      }

      // 2) If we have a valid access token (with a small safety buffer), keep it
      const expires = t.accessTokenExpires;
      const bufferMs = 60_000; // 60s
      if (t.accessToken && expires && Date.now() < expires - bufferMs) {
        return t;
      }

      // 3) Otherwise refresh
      return await refreshGoogleAccessToken(t);
    },

    async session({ session, token }) {
      const t = token as JWTWithGoogle;

      // Expose on session so server routes can use it
      (session as any).accessToken = t.accessToken;
      (session as any).error = t.error;

      return session;
    },
  },

  pages: {
    signIn: "/",
  },

  secret: process.env.NEXTAUTH_SECRET,
};