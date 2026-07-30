from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ScanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    status: Literal["pending", "running", "completed", "failed"]
    started_at: datetime
    completed_at: datetime | None
    error_log: dict[str, Any] | None
    finding_summary: dict[str, Any] | None


class ScanTriggerResponse(BaseModel):
    message: str
    scan_id: UUID
