from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    scan_id: UUID
    channel: Literal["email", "whatsapp"]
    recipient: str
    status: Literal["sent", "failed", "pending"]
    sent_at: datetime | None
    created_at: datetime


class TestNotificationRequest(BaseModel):
    channel: Literal["email", "whatsapp"]
    recipient: str
