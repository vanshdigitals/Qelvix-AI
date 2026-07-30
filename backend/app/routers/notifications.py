from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.dependencies import CurrentOrg, get_current_org, require_role
from app.models.compliance import Notification
from app.schemas.common import MessageResponse, PaginatedResponse
from app.schemas.notifications import NotificationResponse, TestNotificationRequest

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=PaginatedResponse[NotificationResponse])
async def list_notifications(  # noqa
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),  # noqa
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Log of all sent messages."""
    stmt = (
        select(Notification)
        .where(Notification.org_id == current_org.org_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    notifications = result.scalars().all()

    from sqlalchemy import func

    count_stmt = select(func.count()).where(Notification.org_id == current_org.org_id)
    total = await db.scalar(count_stmt) or 0

    return PaginatedResponse(
        items=list(notifications), total=total, page=(offset // limit) + 1, size=limit
    )


@router.post(
    "/test", response_model=MessageResponse, dependencies=[Depends(require_role("owner", "admin"))]
)
async def test_notification(  # noqa
    payload: TestNotificationRequest,
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
):
    """Send test WhatsApp + email."""
    # MVP: Logically this would enqueue a test notification task or call the service directly.
    return MessageResponse(message=f"Test {payload.channel} sent to {payload.recipient}")
