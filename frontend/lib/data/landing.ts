/**
 * Landing page content and the demo fixture.
 *
 * Copy is sourced from 01_PRODUCT_BLUEPRINT.md §6; the agent and phase names
 * from 04_AGENT_PIPELINE.md; the data-source list from 03_BACKEND.md §8.
 */

export interface ProblemStatement {
  id: string;
  statement: string;
}

export const PROBLEMS: readonly ProblemStatement[] = [
  { id: 'exposure', statement: "You don't know what's publicly exposed to attackers." },
  { id: 'dpdp', statement: "You don't know if your organization is DPDP-compliant." },
  { id: 'discovery', statement: 'You find out about breaches from customers, not your tools.' },
  { id: 'shadow', statement: 'Unmonitored subdomains and stale assets create hidden risk.' },
] as const;

export interface SolutionAnswer {
  id: string;
  headline: string;
  detail: string;
}

export const SOLUTIONS: readonly SolutionAnswer[] = [
  {
    id: 'exposure',
    headline: 'Continuous attack surface mapping',
    detail:
      'Every domain, subdomain, SSL certificate, and open port discovered automatedly from an attacker’s perspective.',
  },
  {
    id: 'dpdp',
    headline: 'DPDP readiness verification',
    detail:
      'Automated indicator checks aligned with India’s DPDP Act requirements, delivered as clear actionable tasks.',
  },
  {
    id: 'discovery',
    headline: 'Instant plain-language alerts',
    detail:
      'Immediate notifications via WhatsApp and email explaining what broke, why it matters, and exact remediation steps.',
  },
  {
    id: 'shadow',
    headline: 'Subdomain & DNS drift monitoring',
    detail:
      'Real-time tracking that flags newly pointed DNS records, dangling CNAMEs, and unauthorized administrative endpoints.',
  },
] as const;

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
}

export const WORKFLOW_STEPS: readonly WorkflowStep[] = [
  {
    id: 'input',
    title: 'Enter your domain',
    description: 'No installation, agents, or credit card required to start.',
  },
  {
    id: 'verify',
    title: 'Verify business ownership',
    description: 'A single DNS TXT record or file upload confirms authorization.',
  },
  {
    id: 'scan',
    title: 'Automated continuous scanning',
    description: 'Seven specialized AI agents sweep your public assets weekly.',
  },
  {
    id: 'alert',
    title: 'Get plain-language guidance',
    description: 'Actionable steps for your developer with zero security jargon.',
  },
] as const;

export interface AgentPhase {
  id: string;
  label: string;
  agents: readonly string[];
}

export const AGENT_PHASES: readonly AgentPhase[] = [
  { id: 'discovery', label: 'Discovery', agents: ['Asset Discovery'] },
  { id: 'analysis', label: 'Analysis', agents: ['SSL/TLS', 'DNS & Email', 'Exposure'] },
  { id: 'scoring', label: 'Scoring', agents: ['Risk Scoring'] },
  { id: 'reporting', label: 'Reporting', agents: ['Explanation', 'Notification'] },
] as const;

export const DATA_SOURCES: readonly string[] = [
  'Shodan',
  'SSL Labs',
  'VirusTotal',
  'NVD',
  'AbuseIPDB',
  'SecurityTrails',
  'Google Safe Browsing',
] as const;

export interface ComplianceIndicator {
  id: string;
  label: string;
  state: 'success' | 'medium' | 'critical';
  stateLabel: string;
}

export const COMPLIANCE_INDICATORS: readonly ComplianceIndicator[] = [
  { id: 'tls', label: 'Encryption in transit', state: 'success', stateLabel: 'Ready' },
  { id: 'notice', label: 'Privacy notice published', state: 'success', stateLabel: 'Ready' },
  { id: 'retention', label: 'Data retention stated', state: 'medium', stateLabel: 'Needs work' },
  { id: 'breach', label: 'Breach notification process', state: 'critical', stateLabel: 'Missing' },
] as const;

export interface PricingTier {
  id: string;
  name: string;
  price: string;
  cadence: string;
  summary: string;
  features: readonly string[];
  recommended: boolean;
}

export const PRICING_TIERS: readonly PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0',
    cadence: 'forever',
    summary: 'One domain, scanned monthly.',
    features: ['1 domain', 'Monthly scan', 'Email alerts', 'Plain-language findings'],
    recommended: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '₹2,499',
    cadence: 'per month',
    summary: 'Weekly scans and WhatsApp alerts.',
    features: [
      '5 domains',
      'Weekly scans',
      'WhatsApp + email alerts',
      'DPDP readiness indicators',
      'Up to 5 team members',
    ],
    recommended: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: '₹7,999',
    cadence: 'per month',
    summary: 'Continuous monitoring for larger estates.',
    features: [
      '25 domains',
      'Continuous monitoring',
      'Priority alerting',
      'Exportable reports',
      'Unlimited team members',
    ],
    recommended: false,
  },
] as const;

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const FAQS: readonly FaqItem[] = [
  {
    id: 'safe',
    question: 'Is this safe to run on my live website?',
    answer:
      'Yes. Qelvix only inspects publicly visible configurations and DNS data — the exact information accessible to any browser or web crawler. Nothing is installed on your servers, and your infrastructure is never load-tested.',
  },
  {
    id: 'dpdp-guarantee',
    question: 'How does Qelvix help with India’s DPDP Act?',
    answer:
      'Qelvix continuously monitors your public assets for DPDP readiness indicators such as active SSL/TLS encryption, reachable privacy policy notices, and email consent headers, flagging gaps before penalties occur.',
  },
  {
    id: 'data',
    question: 'Will you sell or share my security scan data?',
    answer:
      'No. Your scan results and asset lists are strictly private to your organization. Data is encrypted at rest and in transit, never sold to third parties, and never used to train public LLM models.',
  },
  {
    id: 'after-scan',
    question: 'What happens after running the free scan?',
    answer:
      'You instantly see your security risk score, asset map, and prioritized findings. There is no credit card required and no automatic trial expiry — your domain remains monitored monthly on the free plan.',
  },
  {
    id: 'technical',
    question: 'Do I need a dedicated security team to use Qelvix?',
    answer:
      'No. Every finding is translated into plain business terms, explaining what failed, why it poses a risk, and giving your web developer or IT admin step-by-step instructions to resolve it.',
  },
  {
    id: 'frequency',
    question: 'How often does Qelvix re-scan my domains?',
    answer:
      'Free accounts are scanned monthly. Growth plans run automated weekly sweeps, while Business tiers receive continuous monitoring with immediate alerts upon DNS or certificate changes.',
  },
  {
    id: 'alerts',
    question: 'How are security alerts delivered?',
    answer:
      'Alerts are sent via Email, WhatsApp, and Slack depending on your preference settings, ensuring critical findings reach your responsible team member immediately.',
  },
  {
    id: 'multiple-domains',
    question: 'Can I monitor multiple brand subdomains and APIs?',
    answer:
      'Yes. Qelvix automatically discovers associated subdomains, mail servers, and admin portals tied to your root domain and monitors them under a single unified dashboard.',
  },
] as const;

/* -------------------------------------------------------------------------- */
/* Demo fixture                                                                */
/* -------------------------------------------------------------------------- */

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface DemoFinding {
  id: string;
  findingType: string;
  title: string;
  severity: Severity;
  asset: string;
  explanation: string;
}

export interface DemoScan {
  domain: string;
  scannedAt: string;
  riskScore: number;
  riskBand: string;
  assets: readonly { id: string; host: string; kind: string }[];
  findings: readonly DemoFinding[];
}

/**
 * Placeholder fixture for the demo surface. Replaced by the output of a real
 * pre-run scan against a placeholder domain before launch — see TODO in the
 * project handover. Shape matches the scan/finding models in 03 §4.1.
 */
export const DEMO_SCAN: DemoScan = {
  domain: 'example-textiles.in',
  scannedAt: '2026-07-21',
  riskScore: 62,
  riskBand: 'Needs attention',
  assets: [
    { id: 'a1', host: 'example-textiles.in', kind: 'Primary domain' },
    { id: 'a2', host: 'www.example-textiles.in', kind: 'Subdomain' },
    { id: 'a3', host: 'mail.example-textiles.in', kind: 'Mail server' },
    { id: 'a4', host: 'shop.example-textiles.in', kind: 'Subdomain' },
    { id: 'a5', host: 'admin.example-textiles.in', kind: 'Subdomain' },
  ],
  findings: [
    {
      id: 'f1',
      findingType: 'ssl_expiring_soon',
      title: 'TLS certificate expires in 9 days',
      severity: 'high',
      asset: 'shop.example-textiles.in',
      explanation:
        'Your online shop’s security certificate runs out on 30 July. When it does, visitors will see a full-page browser warning telling them the site is not secure, and most will leave. Renewing it takes a few minutes with your hosting provider.',
    },
    {
      id: 'f2',
      findingType: 'no_spf',
      title: 'No SPF record published',
      severity: 'medium',
      asset: 'example-textiles.in',
      explanation:
        'Nothing currently tells other mail servers which systems may send email using your domain, so anyone can send email that appears to come from your business. Adding one DNS record fixes this.',
    },
    {
      id: 'f3',
      findingType: 'admin_panel_exposed',
      title: 'Admin login page publicly reachable',
      severity: 'critical',
      asset: 'admin.example-textiles.in',
      explanation:
        'Your administrator login page is open to the whole internet, which means anyone can attempt to guess a password. Restricting it to your office network, or putting it behind a second login step, removes the risk.',
    },
  ],
};

/** The deterministic rule output behind the finding shown in the trust section. */
export const RULE_EVIDENCE = `{
  "rule": "ssl_expiring_soon",
  "asset": "shop.example-textiles.in",
  "evaluated_at": "2026-07-21T04:12:09Z",
  "inputs": {
    "not_after": "2026-07-30T23:59:59Z",
    "days_remaining": 9,
    "issuer": "R3",
    "chain_valid": true
  },
  "threshold": { "warn_below_days": 14, "critical_below_days": 3 },
  "severity": "high",
  "decided_by": "rules_engine"
}`;
