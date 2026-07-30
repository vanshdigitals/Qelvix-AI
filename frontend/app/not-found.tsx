'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function NotFound() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(12);

  useEffect(() => {
    if (countdown <= 0) {
      router.push('/');
      return;
    }

    const timer = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [countdown, router]);

  return (
    <div
      data-theme="dark"
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-canvas p-6 text-center text-content-primary"
    >
      <div className="flex max-w-md flex-col items-center">
        <h1 className="font-display text-[4rem] font-bold leading-none tracking-tight text-content-primary md:text-[5.5rem]">
          404
        </h1>
        <p className="font-body mt-4 text-body-lg text-content-secondary">
          This page doesn&apos;t exist — or it moved.
        </p>
        <p className="font-body mt-2 text-body-sm text-content-muted">
          Redirecting to home in {countdown}s
        </p>

        <button
          type="button"
          onClick={() => {
            router.push('/');
          }}
          className="font-body mt-8 flex h-10 items-center justify-center gap-2 rounded-lg bg-accent px-6 text-body-sm font-semibold text-[#0B0E16] transition-colors duration-200 hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          Go to Homepage
        </button>
      </div>
    </div>
  );
}
