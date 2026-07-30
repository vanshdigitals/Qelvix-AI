from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class OrgProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    primary_domain: str
    whatsapp_number: str | None
    notification_email: str | None
    domain_verified: bool
    created_at: datetime


class OrgSettingsUpdate(BaseModel):
    name: str | None = None
    whatsapp_number: str | None = None
    notification_email: str | None = None


class AssetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    asset_type: Literal["domain", "subdomain", "ip"]
    value: str
    source: Literal["user", "discovery"]
    verified: bool
    created_at: datetime


class AssetCreate(BaseModel):
    asset_type: Literal["domain", "subdomain", "ip"]
    value: str


class VerifyTokenResponse(BaseModel):
    token: str
    txt_record: str


class MemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    user_id: UUID
    role: Literal["owner", "admin", "member"]
    created_at: datetime


class InviteMemberRequest(BaseModel):
    email: str
    role: Literal["owner", "admin", "member"]


class UpdateRoleRequest(BaseModel):
    role: Literal["owner", "admin", "member"]
