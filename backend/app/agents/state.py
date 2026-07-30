from typing_extensions import TypedDict


class AssetInventory(TypedDict):
    domains: list[str]
    subdomains: list[str]
    ips: list[str]
    email_domains: list[str]


class Finding(TypedDict):
    finding_type: str
    agent_source: str
    severity: str  # critical | high | medium | low
    title: str
    raw_data: dict
    asset_value: str


class AgentState(TypedDict):
    # Identity
    org_id: str
    scan_id: str
    primary_domain: str

    # Phase 1: Discovery outputs
    asset_inventory: AssetInventory | None
    port_findings: list[Finding]
    ssl_findings: list[Finding]
    dns_findings: list[Finding]

    # Phase 2: Analysis outputs
    vuln_findings: list[Finding]
    threat_intel_findings: list[Finding]
    phishing_findings: list[Finding]
    fraud_findings: list[Finding]

    # Phase 3: Aggregation outputs
    all_findings: list[Finding]
    risk_score: int | None
    risk_band: str | None  # Low | Medium | High | Critical
    risk_executive_summary: str | None  # DeepSeek-generated
    dpdp_clauses: list[dict] | None
    dpdp_overall_status: str | None
    dpdp_narrative: str | None  # DeepSeek-generated

    # Phase 4: Action outputs
    ir_plan: dict | None
    remediation_map: dict  # finding_id -> remediation text
    notifications_sent: list[str]
    errors: list[str]
