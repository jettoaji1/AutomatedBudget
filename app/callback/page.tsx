// app/callback/page.tsx
import { Suspense } from 'react';
import CallbackClient from './CallbackClient';

export const dynamic = 'force-dynamic';

export default function CallbackPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, fontFamily: 'system-ui' }}>Connecting your bank…</div>}>
      <CallbackClient />
    </Suspense>
  );
}