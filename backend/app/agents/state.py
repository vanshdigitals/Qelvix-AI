from typing import List, Optional
from typing_extensions import TypedDict

class AssetInventory(TypedDict):
    domains: List[str]
    subdomains: List[str]
    ips: List[str]
    email_domains: List[str]

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
    asset_inventory: Optional[AssetInventory]
    port_findings: List[Finding]
    ssl_findings: List[Finding]
    dns_findings: List[Finding]

    # Phase 2: Analysis outputs
    vuln_findings: List[Finding]
    threat_intel_findings: List[Finding]
    phishing_findings: List[Finding]
    fraud_findings: List[Finding]

    # Phase 3: Aggregation outputs
    all_findings: List[Finding]
    risk_score: Optional[int]
    risk_band: Optional[str]  # Low | Medium | High | Critical
    risk_executive_summary: Optional[str]  # DeepSeek-generated
    dpdp_clauses: Optional[List[dict]]
    dpdp_overall_status: Optional[str]
    dpdp_narrative: Optional[str]  # DeepSeek-generated

    # Phase 4: Action outputs
    ir_plan: Optional[dict]
    remediation_map: dict  # finding_id -> remediation text
    notifications_sent: List[str]
    errors: List[str]
