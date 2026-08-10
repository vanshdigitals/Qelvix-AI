import type { Metadata } from 'next';

import { HelpScreen } from '@/components/dashboard/screens/HelpScreen';

export const metadata: Metadata = { title: 'Help center — Qelvix' };

export default function HelpPage() {
  return <HelpScreen />;
}
