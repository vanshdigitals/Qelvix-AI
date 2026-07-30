from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ComplianceReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    scan_id: UUID
    framework: str
    is_compliant: bool
    dpdp_narrative: str | None
    created_at: datetime
