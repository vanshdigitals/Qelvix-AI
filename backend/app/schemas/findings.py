from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FindingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    scan_id: UUID
    asset_id: UUID | None
    finding_type: str
    severity: Literal["critical", "high", "medium", "low", "info"]
    status: Literal["open", "acknowledged", "resolved", "false_positive"]
    raw_data: dict[str, Any]
    plain_explanation: str | None
    remediation_steps: str | None
    false_positive_reason: str | None
    created_at: datetime
    updated_at: datetime


class FindingStatusUpdate(BaseModel):
    status: Literal["open", "acknowledged", "resolved", "false_positive"]
    false_positive_reason: str | None = Field(default=None, max_length=500)
