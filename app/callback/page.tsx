'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CallbackPage({
  searchParams,
}: {
  searchParams: {
    code?: string;
    error?: string;
    error_description?: string;
  };
}) {
  const router = useRouter();

  useEffect(() => {
    if (searchParams.error) return;

    if (!searchParams.code) return;

    (async () => {
      const res = await fetch('/api/truelayer/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: searchParams.code }),
      });

      if (res.ok) {
        router.replace('/dashboard');
      } else {
        router.replace('/settings');
      }
    })();
  }, [searchParams, router]);

  return (
    <main className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Connecting your bank…</p>
      </div>
    </main>
  );
}