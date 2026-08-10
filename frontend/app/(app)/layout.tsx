import { AppShell } from '@/components/dashboard/AppShell';
import { OnboardingGuard } from '@/components/onboarding/OnboardingGuard';

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // AppShell (sidebar + header) renders immediately; the onboarding gate wraps
  // only the page content, so navigation feels instant instead of blanking the
  // whole app on one getOnboarding round-trip.
  return (
    <AppShell>
      <OnboardingGuard>{children}</OnboardingGuard>
    </AppShell>
  );
}
