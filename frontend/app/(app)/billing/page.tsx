import type { Metadata } from 'next';

import { BillingScreen } from '@/components/dashboard/screens/BillingScreen';

export const metadata: Metadata = { title: 'Billing — Qelvix' };

export default function BillingPage() {
  return <BillingScreen />;
}
