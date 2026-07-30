import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db_session
from app.models.org import Member, Organization
from app.schemas.auth import AuthResponse, LoginRequest, RefreshRequest, RegisterRequest

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


@router.post("/register", response_model=AuthResponse)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db_session)):  # noqa
    """Register a new organization and owner."""
    # 1. Sign up the user in Supabase Auth
    supabase_auth_url = f"{settings.supabase_url}/auth/v1/signup"
    headers = {
        "apikey": settings.supabase_service_key.get_secret_value(),
        "Authorization": f"Bearer {settings.supabase_service_key.get_secret_value()}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            supabase_auth_url,
            headers=headers,
            json={
                "email": payload.email,
                "password": payload.password,
            },
        )
        if resp.status_code >= 400:
            raise HTTPException(
                status_code=resp.status_code, detail=resp.json().get("msg", "Signup failed")
            )

        auth_data = resp.json()
        user_id = auth_data.get("user", {}).get("id") or auth_data.get("id")

        if not user_id:
            raise HTTPException(
                status_code=500, detail="Failed to retrieve user ID from Auth provider"
            )

        # 2. Create Organization
        org = Organization(
            name=payload.company_name,
            primary_domain=payload.domain,
        )
        db.add(org)
        try:
            await db.flush()  # to get org.id
        except IntegrityError:
            await db.rollback()
            raise HTTPException(status_code=409, detail="Domain already registered")  # noqa

        # 3. Create Owner Member
        member = Member(org_id=org.id, user_id=user_id, role="owner")
        db.add(member)
        await db.commit()

        # 4. Update the user's app_metadata in Supabase to include org_id
        admin_update_url = f"{settings.supabase_url}/auth/v1/admin/users/{user_id}"
        update_resp = await client.put(
            admin_update_url, headers=headers, json={"app_metadata": {"org_id": str(org.id)}}
        )
        if update_resp.status_code >= 400:
            # Not fatal if token is re-issued, but they won't have the claim
            pass

        # Optionally login to return JWTs immediately if Supabase didn't return session data in signup  # noqa
        access_token = auth_data.get("session", {}).get("access_token")
        refresh_token = auth_data.get("session", {}).get("refresh_token")

        if not access_token:
            # Need to login manually
            login_url = f"{settings.supabase_url}/auth/v1/token?grant_type=password"
            login_resp = await client.post(
                login_url,
                headers=headers,
                json={"email": payload.email, "password": payload.password},
            )
            login_data = login_resp.json()
            access_token = login_data.get("access_token")
            refresh_token = login_data.get("refresh_token")

        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user_id=user_id,
            org_id=str(org.id),
        )


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest):  # noqa
    """Login and return a JWT."""
    login_url = f"{settings.supabase_url}/auth/v1/token?grant_type=password"
    # For login, we can just use the anon key if available, but service key works
    headers = {
        "apikey": settings.supabase_service_key.get_secret_value(),
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            login_url, headers=headers, json={"email": payload.email, "password": payload.password}
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        data = resp.json()

        return AuthResponse(
            access_token=data.get("access_token"),
            refresh_token=data.get("refresh_token"),
            user_id=data.get("user", {}).get("id"),
            org_id=data.get("user", {}).get("app_metadata", {}).get("org_id", ""),
        )


@router.post("/refresh", response_model=AuthResponse)
async def refresh(payload: RefreshRequest):  # noqa
    """Refresh the access token."""
    refresh_url = f"{settings.supabase_url}/auth/v1/token?grant_type=refresh_token"
    headers = {
        "apikey": settings.supabase_service_key.get_secret_value(),
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            refresh_url, headers=headers, json={"refresh_token": payload.refresh_token}
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        data = resp.json()

        return AuthResponse(
            access_token=data.get("access_token"),
            refresh_token=data.get("refresh_token"),
            user_id=data.get("user", {}).get("id"),
            org_id=data.get("user", {}).get("app_metadata", {}).get("org_id", ""),
        )
