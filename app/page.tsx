// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSettingUp, setIsSettingUp] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && session) {
      handleSetup();
    }
  }, [status, session]);

  const handleSetup = async () => {
    setIsSettingUp(true);
    try {
      const response = await fetch('/api/setup', { method: 'POST' });
      
      if (response.ok) {
        router.push('/dashboard');
      } else {
        console.error('Setup failed');
        setIsSettingUp(false);
      }
    } catch (error) {
      console.error('Setup error:', error);
      setIsSettingUp(false);
    }
  };

  if (status === 'loading' || isSettingUp) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{isSettingUp ? 'Setting up...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Budget Tool</h2>
            <p className="mt-2 text-gray-600">
              Automated budget tracking with Google Drive
            </p>
          </div>
          
          <button
            onClick={() => signIn('google')}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Connect Google Drive
          </button>
        </div>
      </div>
    );
  }

  return null;
}
