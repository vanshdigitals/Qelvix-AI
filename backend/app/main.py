"""FastAPI application factory.

``create_app()`` is a factory rather than a module-level ``app`` instance so
tests can construct an isolated application with overridden settings and
dependency overrides (03 §3).
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.config import Settings, get_settings


class HealthResponse(BaseModel):
    """Liveness payload. A router never returns a bare dict (INV-09)."""

    status: str
    environment: str
    commit: str | None = None


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the application.

    Args:
        settings: Overrides the environment-derived settings. Used by tests to
            construct an app without reading the process environment.
    """
    resolved = settings or get_settings()

    app = FastAPI(
        title="Qelvix API",
        version="0.1.0",
        docs_url="/docs",
        openapi_url="/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[resolved.frontend_url],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    from app.routers import (
        auth,
        compliance,
        dashboard,
        findings,
        members,
        notifications,
        org,
        scans,
        webhooks,
    )

    app.include_router(auth.router)
    app.include_router(org.router)
    app.include_router(members.router)
    app.include_router(scans.router)
    app.include_router(findings.router)
    app.include_router(compliance.router)
    app.include_router(dashboard.router)
    app.include_router(notifications.router)
    app.include_router(webhooks.router)

    @app.get("/health", response_model=HealthResponse, tags=["system"])
    async def health() -> HealthResponse:
        """Liveness probe. Unauthenticated by design — it reports no tenant data."""
        import os
        return HealthResponse(
            status="ok", 
            environment=resolved.environment,
            commit=os.environ.get("RENDER_GIT_COMMIT")
        )

    @app.get("/debug-jwks", tags=["system"])
    async def debug_jwks():
        import httpx
        url = f"{resolved.supabase_url}/auth/v1/.well-known/jwks.json"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                return {
                    "status_code": resp.status_code,
                    "url": url,
                    "body_preview": resp.text[:200]
                }
        except Exception as e:
            return {
                "error": str(e),
                "error_type": type(e).__name__,
                "url": url
            }

    return app
