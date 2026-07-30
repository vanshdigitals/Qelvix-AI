import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.dependencies import CurrentOrg, get_current_org, require_role
from app.models.org import Member
from app.schemas.common import MessageResponse, PaginatedResponse
from app.schemas.org import InviteMemberRequest, MemberResponse, UpdateRoleRequest

router = APIRouter(prefix="/org/me/members", tags=["members"])


@router.get("", response_model=PaginatedResponse[MemberResponse])
async def list_members(
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """List members + roles."""
    stmt = (
        select(Member)
        .where(Member.org_id == current_org.org_id)
        .order_by(Member.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    members = result.scalars().all()
    
    from sqlalchemy import func
    count_stmt = select(func.count()).where(Member.org_id == current_org.org_id)
    total = await db.scalar(count_stmt) or 0
    
    return PaginatedResponse(
        items=list(members),
        total=total,
        page=(offset // limit) + 1,
        size=limit
    )


@router.post("/invite", response_model=MessageResponse, dependencies=[Depends(require_role("owner", "admin"))])
async def invite_member(
    payload: InviteMemberRequest,
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),
):
    """Invite member."""
    # MVP: Logically this would integrate with Supabase Admin API to send an invite email
    # and create the Member record once accepted, or create it in 'pending' state.
    # For now, stub successful return.
    return MessageResponse(message=f"Invite sent to {payload.email}")


async def _get_owner_count(org_id: uuid.UUID, db: AsyncSession) -> int:
    from sqlalchemy import func
    stmt = select(func.count()).where(Member.org_id == org_id, Member.role == "owner")
    return await db.scalar(stmt) or 0


@router.put("/{member_id}/role", response_model=MemberResponse, dependencies=[Depends(require_role("owner", "admin"))])
async def update_member_role(
    member_id: uuid.UUID,
    payload: UpdateRoleRequest,
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),
):
    """Update role. Cannot demote sole owner."""
    member = await db.get(Member, member_id)
    if not member or member.org_id != current_org.org_id:
        raise HTTPException(status_code=404, detail="Member not found")
        
    if member.role == "owner" and payload.role != "owner":
        # Check if they are the sole owner
        owner_count = await _get_owner_count(current_org.org_id, db)
        if owner_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot demote the sole owner")
            
    member.role = payload.role
    await db.commit()
    await db.refresh(member)
    return member


@router.delete("/{member_id}", status_code=status.HTTP_202_ACCEPTED, dependencies=[Depends(require_role("owner", "admin"))])
async def remove_member(
    member_id: uuid.UUID,
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),
):
    """Remove member. Cannot remove sole owner."""
    member = await db.get(Member, member_id)
    if not member or member.org_id != current_org.org_id:
        raise HTTPException(status_code=404, detail="Member not found")
        
    if member.role == "owner":
        owner_count = await _get_owner_count(current_org.org_id, db)
        if owner_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove the sole owner")
            
    await db.delete(member)
    await db.commit()
    return {"message": "Member removed"}
