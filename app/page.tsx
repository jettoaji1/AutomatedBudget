// app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (session) {
      router.replace('/dashboard');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg text-center">
          <h2 className="text-3xl font-bold text-gray-900">Budget Tool</h2>
          <p className="mt-2 text-gray-600">
            Automated budget tracking with Google Drive
          </p>
          <button
            onClick={() => signIn('google')}
            className="w-full mt-6 px-4 py-3 text-white bg-blue-600 rounded-md hover:bg-blue-700 font-medium"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // Session exists but redirect hasn't completed yet
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}