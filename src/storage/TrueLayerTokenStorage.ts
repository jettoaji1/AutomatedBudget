// src/storage/TrueLayerTokenStorage.ts

import { GoogleDriveClient } from './GoogleDriveClient';

const TRUELAYER_TOKEN_FILE = 'truelayer/tokens.json';

export type TrueLayerTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch ms
  token_type: string;
  scope?: string;
  updated_at: string;
};

export class TrueLayerTokenStorage {
  constructor(private driveClient: GoogleDriveClient) {}

  /**
   * Save (or overwrite) TrueLayer tokens in Google Drive
   */
  async saveTokens(tokens: TrueLayerTokens): Promise<void> {
    await this.driveClient.writeFile(TRUELAYER_TOKEN_FILE, tokens);
  }

  /**
   * Load tokens from Google Drive
   */
  async getTokens(): Promise<TrueLayerTokens | null> {
    const tokens = await this.driveClient.readFile<TrueLayerTokens>(
      TRUELAYER_TOKEN_FILE
    );

    return tokens ?? null;
  }


  async getValidAccessToken(): Promise<string> {
    const bufferMs = 60_000;

    const tokens = await this.getTokens();
    if (!tokens) throw new Error('No TrueLayer tokens found. User must re-auth.');

    // still valid
    if (Date.now() < tokens.expires_at - bufferMs) return tokens.access_token;

    // try refresh
    try {
      const refreshed = await this.refreshAccessToken(tokens.refresh_token);
      await this.saveTokens(refreshed);
      return refreshed.access_token;
    } catch (err) {
      // If refresh token rotated in another concurrent request,
      // re-read tokens.json and try to use the newer token set.
      const msg = err instanceof Error ? err.message : String(err);

      if (msg.includes('invalid_grant')) {
        const latest = await this.getTokens();

        if (latest && latest.updated_at !== tokens.updated_at) {
          if (Date.now() < latest.expires_at - bufferMs) return latest.access_token;

          // latest exists but expired -> attempt refresh with latest refresh_token once
          const refreshed2 = await this.refreshAccessToken(latest.refresh_token);
          await this.saveTokens(refreshed2);
          return refreshed2.access_token;
        }
      }

      throw err;
    }
  }

  /**
   * Refresh access token using refresh_token
   */
  private async refreshAccessToken(
    refreshToken: string
  ): Promise<TrueLayerTokens> {
    const response = await fetch('https://auth.truelayer.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.TRUELAYER_CLIENT_ID!,
        client_secret: process.env.TRUELAYER_CLIENT_SECRET!,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[TRUELAYER] refresh failed', {
        status: response.status,
        data,
      });
      throw new Error(`TrueLayer token refresh failed (${response.status}): ${JSON.stringify(data)}`);
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? refreshToken,
      token_type: data.token_type,
      scope: data.scope,
      expires_at: Date.now() + data.expires_in * 1000,
      updated_at: new Date().toISOString(),
    };
  }
}