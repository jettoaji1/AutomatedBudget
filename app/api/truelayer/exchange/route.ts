// app/api/truelayer/exchange/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createStorageManager } from '@/lib/drive-server';
import { TrueLayerTokenStorage } from '@/src/storage/TrueLayerTokenStorage';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
    }

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
      return NextResponse.json({ error: 'Token exchange failed', details: data }, { status: 400 });
    }

    const tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + Number(data.expires_in) * 1000,
      token_type: data.token_type,
      scope: data.scope,
      updated_at: new Date().toISOString(),
    };

    const storage = await createStorageManager(session.accessToken);
    const tokenStorage = new TrueLayerTokenStorage(storage.driveClient);
    await tokenStorage.saveTokens(tokens);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('TrueLayer exchange error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}