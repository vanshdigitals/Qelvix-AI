from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.findings import FindingResponse


class ScanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    status: Literal["queued", "pending", "running", "completed", "failed"]
    risk_score: int | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error_log: str | None = None
    findings_summary: dict[str, Any] | None = None


class ScanTriggerResponse(BaseModel):
    message: str
    scan_id: UUID


class RecommendationItem(BaseModel):
    """A recommendation derived strictly from a real finding."""

    finding_type: str
    severity: str
    title: str
    action: str


class ComplianceSummary(BaseModel):
    status: str | None = None
    clauses: list[dict[str, Any]] | None = None
    narrative: str | None = None


class ScanReportResponse(BaseModel):
    """Full report assembled from real scan data — no fabricated content."""

    scan_id: UUID
    status: str
    risk_score: int | None
    risk_band: str | None
    started_at: datetime | None
    completed_at: datetime | None
    summary: dict[str, int]
    executive_summary: str | None
    findings: list[FindingResponse]
    recommendations: list[RecommendationItem]
    compliance: ComplianceSummary
    degraded_providers: list[str]
