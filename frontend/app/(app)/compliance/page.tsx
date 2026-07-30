import type { Metadata } from 'next';

import { ComplianceScreen } from '@/components/dashboard/screens/ComplianceScreen';

export const metadata: Metadata = { title: 'DPDP readiness — Qelvix' };

export default function CompliancePage() {
  return <ComplianceScreen />;
}
