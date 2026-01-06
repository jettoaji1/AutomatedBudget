// app/api/truelayer/exchange/route.ts
import { NextResponse } from 'next/server';
import { TrueLayerTokenStorage } from '@/src/storage/TrueLayerTokenStorage';
import { createDriveStorageManager } from '@/lib/drive-server';

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Missing authorization code' },
        { status: 400 }
      );
    }

    // Exchange code for tokens
    const res = await fetch('https://auth.truelayer.com/connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.TRUELAYER_REDIRECT_URI!,
        client_id: process.env.TRUELAYER_CLIENT_ID!,
        client_secret: process.env.TRUELAYER_CLIENT_SECRET!,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Token exchange failed', details: data },
        { status: 400 }
      );
    }

    const expiresAt = Date.now() + data.expires_in * 1000;

    const tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAt,
      token_type: data.token_type,
      scope: data.scope,
      updated_at: new Date().toISOString(),
    };

    // Persist tokens to Google Drive
    const storage = await createDriveStorageManager();
    const tokenStorage = new TrueLayerTokenStorage(storage.driveClient);
    await tokenStorage.saveTokens(tokens);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('TrueLayer exchange error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}