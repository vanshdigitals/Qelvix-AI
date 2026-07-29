import type { Metadata } from 'next';

import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

export const metadata: Metadata = {
  title: 'Onboarding — Qelvix',
  description: 'Set up your organization, verify your domain, and run your first exposure scan.',
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
