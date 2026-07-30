import type { Metadata } from 'next';

import { AuditScreen } from '@/components/dashboard/screens/AuditScreen';

export const metadata: Metadata = { title: 'Audit log — Qelvix' };

export default function AuditPage() {
  return <AuditScreen />;
}
