/**
 * Demo fixtures for the authenticated app. These stand in for the findings/
 * scans/billing APIs until those endpoints land; every screen reads from here
 * so the sample org (Vardhman Exports) stays internally consistent.
 */

export interface Finding {
  id: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  title: string;
  asset: string;
  ruleId: string;
  age: string;
  status: 'Open' | 'Acknowledged' | 'Resolved';
}

export const FINDINGS: Finding[] = [
  {
    id: 'QX-SSL-001',
    severity: 'Critical',
    title: 'SSL certificate expired 4 days ago',
    asset: 'mail.vardhmanexports.in',
    ruleId: 'QX-SSL-001',
    age: '4d open',
    status: 'Open',
  },
  {
    id: 'QX-DMARC-004',
    severity: 'High',
    title: 'No DMARC record — email is spoofable',
    asset: 'vardhmanexports.in',
    ruleId: 'QX-DMARC-004',
    age: '12d open',
    status: 'Open',
  },
  {
    id: 'QX-BREACH-011',
    severity: 'High',
    title: 'Company email found in a breach corpus',
    asset: '3 accounts',
    ruleId: 'QX-BREACH-011',
    age: 'new',
    status: 'Open',
  },
  {
    id: 'QX-SPF-002',
    severity: 'Medium',
    title: 'SPF record uses soft-fail (~all)',
    asset: 'vardhmanexports.in',
    ruleId: 'QX-SPF-002',
    age: '9d open',
    status: 'Acknowledged',
  },
  {
    id: 'QX-HDR-018',
    severity: 'Medium',
    title: 'Missing HSTS header on primary site',
    asset: 'www.vardhmanexports.in',
    ruleId: 'QX-HDR-018',
    age: '9d open',
    status: 'Open',
  },
  {
    id: 'QX-PORT-030',
    severity: 'Low',
    title: 'Legacy FTP port 21 reachable',
    asset: 'files.vardhmanexports.in',
    ruleId: 'QX-PORT-030',
    age: '21d open',
    status: 'Open',
  },
];

/** The three highest-priority items surfaced on the Overview + bell. */
export const RECENT_FINDINGS = FINDINGS.slice(0, 3).map((f) => ({
  severity: f.severity,
  title: f.title,
  asset: f.asset,
  age: f.age,
}));

export interface Asset {
  id: string;
  host: string;
  kind: string;
  verified: 'Verified' | 'Unclaimed';
  ip: string;
  ssl: string;
  findings: number;
  lastScan: string;
}

export const ASSETS: Asset[] = [
  {
    id: 'vardhmanexports-in',
    host: 'vardhmanexports.in',
    kind: 'Primary domain',
    verified: 'Verified',
    ip: '103.21.58.12',
    ssl: 'Valid · 240d',
    findings: 2,
    lastScan: 'Today 06:04',
  },
  {
    id: 'mail-vardhmanexports-in',
    host: 'mail.vardhmanexports.in',
    kind: 'Mail host',
    verified: 'Verified',
    ip: '103.21.58.20',
    ssl: 'Expired',
    findings: 1,
    lastScan: 'Today 06:04',
  },
  {
    id: 'www-vardhmanexports-in',
    host: 'www.vardhmanexports.in',
    kind: 'Web host',
    verified: 'Verified',
    ip: '103.21.58.12',
    ssl: 'Valid · 240d',
    findings: 1,
    lastScan: 'Today 06:04',
  },
  {
    id: 'files-vardhmanexports-in',
    host: 'files.vardhmanexports.in',
    kind: 'Subdomain',
    verified: 'Verified',
    ip: '103.21.58.33',
    ssl: 'Valid · 88d',
    findings: 1,
    lastScan: 'Today 06:04',
  },
  {
    id: 'shop-vardhmanexports-in',
    host: 'shop.vardhmanexports.in',
    kind: 'Subdomain',
    verified: 'Unclaimed',
    ip: '—',
    ssl: '—',
    findings: 0,
    lastScan: 'Not scanned',
  },
];

export interface ScanRun {
  id: string;
  started: string;
  trigger: string;
  status: 'Running' | 'Complete' | 'Partial' | 'Failed';
  duration: string;
  findings: string;
}

export const SCANS: ScanRun[] = [
  {
    id: 'scan_8f3c1d',
    started: 'Today 06:02',
    trigger: 'Scheduled',
    status: 'Running',
    duration: '—',
    findings: '—',
  },
  {
    id: 'scan_7a19be',
    started: '22 Jul 06:00',
    trigger: 'Scheduled',
    status: 'Partial',
    duration: '4m 12s',
    findings: '9',
  },
  {
    id: 'scan_6b04af',
    started: '15 Jul 06:00',
    trigger: 'Scheduled',
    status: 'Complete',
    duration: '3m 51s',
    findings: '8',
  },
  {
    id: 'scan_5c92de',
    started: '12 Jul 14:22',
    trigger: 'Manual · Priya',
    status: 'Complete',
    duration: '3m 40s',
    findings: '8',
  },
];

export const ACTIVITY_FEED = [
  {
    actor: 'Qelvix',
    text: 'completed a scheduled scan · 9 findings',
    when: '06:04',
    dot: 'bg-accent',
  },
  {
    actor: 'Amit Kumar',
    text: 'marked SPF soft-fail as resolved',
    when: 'Yesterday',
    dot: 'bg-success-text',
  },
  {
    actor: 'Qelvix',
    text: 'sent a WhatsApp alert to +91 98••• •••21',
    when: 'Yesterday',
    dot: 'bg-accent',
  },
  {
    actor: 'Priya Sharma',
    text: 'invited amit@vardhmanexports.in as Admin',
    when: '2d',
    dot: 'bg-content-muted',
  },
  {
    actor: 'Qelvix',
    text: 'certificate finding regressed after being resolved',
    when: '3d',
    dot: 'bg-critical-text',
  },
];

export interface TeamMember {
  initials: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Member';
  status: 'Active' | 'Invited';
  lastActive: string;
  you?: boolean;
}

export const TEAM: TeamMember[] = [
  {
    initials: 'PS',
    name: 'Priya Sharma',
    email: 'priya@vardhmanexports.in',
    role: 'Owner',
    status: 'Active',
    lastActive: 'Now',
    you: true,
  },
  {
    initials: 'AK',
    name: 'Amit Kumar',
    email: 'amit@vardhmanexports.in',
    role: 'Admin',
    status: 'Active',
    lastActive: '2h ago',
  },
  {
    initials: 'RN',
    name: 'Rahul Nair',
    email: 'rahul@vardhmanexports.in',
    role: 'Member',
    status: 'Invited',
    lastActive: 'Pending',
  },
];

export interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: 'Paid' | 'Due';
}

export const INVOICES: Invoice[] = [
  { id: 'INV-2026-07', date: '01 Jul 2026', amount: '₹2,949', status: 'Paid' },
  { id: 'INV-2026-06', date: '01 Jun 2026', amount: '₹2,949', status: 'Paid' },
  { id: 'INV-2026-05', date: '01 May 2026', amount: '₹2,949', status: 'Paid' },
  { id: 'INV-2026-04', date: '01 Apr 2026', amount: '₹2,949', status: 'Paid' },
];

export interface AuditEntry {
  time: string;
  actor: string;
  action: string;
  target: string;
  ip: string;
}

export const AUDIT: AuditEntry[] = [
  {
    time: '30 Jul 06:04',
    actor: 'Qelvix',
    action: 'scan.complete',
    target: 'scan_7a19be · 9 findings',
    ip: '—',
  },
  {
    time: '29 Jul 18:11',
    actor: 'Amit Kumar',
    action: 'finding.resolve',
    target: 'QX-SPF-002',
    ip: '49.36.12.7',
  },
  {
    time: '29 Jul 09:02',
    actor: 'Priya Sharma',
    action: 'member.invite',
    target: 'rahul@vardhmanexports.in',
    ip: '49.36.12.7',
  },
  {
    time: '28 Jul 21:47',
    actor: 'Qelvix',
    action: 'alert.whatsapp',
    target: '+91 98••• •••21',
    ip: '—',
  },
  {
    time: '28 Jul 14:20',
    actor: 'Priya Sharma',
    action: 'auth.login',
    target: 'session mac-chrome',
    ip: '49.36.12.7',
  },
  {
    time: '27 Jul 06:00',
    actor: 'Qelvix',
    action: 'scan.complete',
    target: 'scan_6b04af · 8 findings',
    ip: '—',
  },
];

export interface DpdpClause {
  clause: string;
  title: string;
  summary: string;
  state: 'Met' | 'Gap' | 'Manual';
}

export const DPDP_CLAUSES: DpdpClause[] = [
  {
    clause: 'S.8(5)',
    title: 'Reasonable security safeguards',
    summary: 'TLS in force across public endpoints, one certificate expired on the mail host.',
    state: 'Gap',
  },
  {
    clause: 'S.8(4)',
    title: 'Accuracy of transmitted data',
    summary: 'SPF present; DMARC missing, so outbound mail can be spoofed in your name.',
    state: 'Gap',
  },
  {
    clause: 'S.5',
    title: 'Notice at collection',
    summary: 'Public privacy notice found and reachable from the site footer.',
    state: 'Met',
  },
  {
    clause: 'S.8(7)',
    title: 'Data retention limits',
    summary: 'Retention policy requires internal evidence Qelvix cannot observe externally.',
    state: 'Manual',
  },
  {
    clause: 'S.8(6)',
    title: 'Breach notification readiness',
    summary: 'Registered contact configured; response runbook needs internal sign-off.',
    state: 'Manual',
  },
  {
    clause: 'S.6',
    title: 'Consent management',
    summary: 'Cookie consent banner detected on all crawled pages.',
    state: 'Met',
  },
];
