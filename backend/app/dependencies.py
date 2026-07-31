import uuid
from typing import Annotated

import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db_session
from app.models.org import Member

settings = get_settings()
security = HTTPBearer()

jwks_client = PyJWKClient(f"{settings.supabase_url}/auth/v1/.well-known/jwks.json", cache_keys=True)


async def get_current_user_token(
    credentials: Annotated[HTTPAuthorizationCredentials, Security(security)],
) -> dict:
    """Verifies the JWT and returns the decoded payload."""
    try:
        unverified_header = jwt.get_unverified_header(credentials.credentials)
        if unverified_header.get("alg") == "HS256":
            # Legacy symmetric signing
            payload = jwt.decode(
                credentials.credentials,
                settings.secret_key.get_secret_value(),
                algorithms=["HS256"],
                audience="authenticated",
            )
        else:
            # Asymmetric signing (RS256, ES256, etc.)
            signing_key = jwks_client.get_signing_key_from_jwt(credentials.credentials)
            payload = jwt.decode(
                credentials.credentials,
                signing_key.key,
                algorithms=["RS256", "ES256", "HS256"],
                audience="authenticated",
            )
        return payload
    except jwt.PyJWKClientError as e:
        print(f"DEBUG_JWT_ERROR [PyJWKClientError]: {e}")
        raise HTTPException(  # noqa
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not fetch JWKS from identity provider",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.ExpiredSignatureError as e:
        print(f"DEBUG_JWT_ERROR [ExpiredSignatureError]: {e}")
        raise HTTPException(  # noqa
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        print(f"DEBUG_JWT_ERROR [InvalidTokenError or generic]: {type(e).__name__} - {e}")
        raise HTTPException(  # noqa
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


class CurrentOrg:
    """Dataclass holding the authenticated context."""

    def __init__(self, user_id: uuid.UUID, org_id: uuid.UUID):  # noqa
        self.user_id = user_id
        self.org_id = org_id


async def get_current_org(
    token_payload: Annotated[dict, Depends(get_current_user_token)],
) -> CurrentOrg:
    """Extracts user_id and org_id from the verified JWT."""
    sub = token_payload.get("sub")
    app_metadata = token_payload.get("app_metadata", {})
    user_metadata = token_payload.get("user_metadata", {})

    # Check if org_id is in app_metadata or directly on the token.
    # The TRD says "reads the active org_id from a custom JWT claim".
    org_id_str = (
        token_payload.get("org_id") or app_metadata.get("org_id") or user_metadata.get("org_id")
    )

    if not sub:
        raise HTTPException(status_code=401, detail="Subject missing in token")
    if not org_id_str:
        raise HTTPException(status_code=401, detail="No active org_id found in token")

    try:
        user_id = uuid.UUID(sub)
        org_id = uuid.UUID(org_id_str)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid UUID format in token claims")  # noqa

    return CurrentOrg(user_id=user_id, org_id=org_id)


def require_role(*roles: str):  # noqa
    """
    Dependency factory to enforce RBAC.
    Returns a dependency that checks if the current user has one of the
    required roles in the active org.
    """

    async def role_checker(
        current_org: Annotated[CurrentOrg, Depends(get_current_org)],
        db: Annotated[AsyncSession, Depends(get_db_session)],
    ) -> CurrentOrg:
        if not roles:
            return current_org

        stmt = (
            select(Member.role)
            .where(Member.user_id == current_org.user_id)
            .where(Member.org_id == current_org.org_id)
        )
        result = await db.execute(stmt)
        role = result.scalar_one_or_none()

        if not role or role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_org

    return role_checker
