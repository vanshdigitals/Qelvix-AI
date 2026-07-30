'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Panel, PanelTitle, PrimaryButton } from '@/components/dashboard/shared';

export function PlaceholderPage({ isPublic = false }: { isPublic?: boolean }) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(10);
  const targetUrl = isPublic ? '/' : '/dashboard';
  const targetName = isPublic ? 'homepage' : 'dashboard';

  useEffect(() => {
    if (seconds <= 0) {
      router.push(targetUrl);
      return;
    }

    const timer = setInterval(() => {
      setSeconds((s) => s - 1);
    }, 1000);

    return () => { clearInterval(timer); };
  }, [seconds, router, targetUrl]);

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Panel className="flex flex-col items-center gap-6 text-center">
          <div className="flex flex-col gap-2">
            <PanelTitle>This page is under development</PanelTitle>
            <p className="text-body-sm text-content-secondary">
              We&apos;re still building this. You&apos;ll be redirected to your {targetName} in {seconds} second{seconds !== 1 ? 's' : ''}.
            </p>
          </div>
          
          <PrimaryButton onClick={() => { router.push(targetUrl); }}>
            Return to {targetName}
          </PrimaryButton>
        </Panel>
      </div>
    </div>
  );
}
