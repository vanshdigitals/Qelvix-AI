from pydantic import BaseModel


class DashboardSummaryResponse(BaseModel):
    security_health_band: str  # e.g., "A", "B", "C"
    risk_score: int
    total_assets: int
    open_critical_findings: int
    open_high_findings: int


class DashboardAssetsResponse(BaseModel):
    total_domains: int
    total_subdomains: int
    total_ips: int
