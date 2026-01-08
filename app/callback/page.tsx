// app/callback/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function CallbackPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = useState('Connecting your bank…');

  useEffect(() => {
    const run = async () => {
      const error = sp.get('error');
      const errorDesc = sp.get('error_description');
      const code = sp.get('code');

      if (error) {
        setMsg(`TrueLayer error: ${error}${errorDesc ? ` — ${errorDesc}` : ''}`);
        return;
      }

      if (!code) {
        setMsg('No authorization code found in callback.');
        return;
      }

      try {
        const res = await fetch('/api/truelayer/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setMsg(`Token exchange failed: ${data?.error ?? 'Unknown error'}`);
          return;
        }

        setMsg('Bank connected! Redirecting…');
        router.replace('/dashboard');
      } catch (e) {
        setMsg('Token exchange failed (network/server error).');
      }
    };

    run();
  }, [sp, router]);

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>TrueLayer Callback</h1>
      <p>{msg}</p>
    </main>
  );
}