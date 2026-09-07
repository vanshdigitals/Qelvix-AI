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

    # Collect allowed origins: support comma-separated list in FRONTEND_URL
    # and explicitly permit verified production and preview domains (qelvix.aivon.io, vercel.app)
    allowed_origins = {
        origin.strip()
        for origin in resolved.frontend_url.split(",")
        if origin.strip()
    }
    allowed_origins.add("https://qelvix.aivon.io")
    allowed_origins.add("https://qelvix-ai.vercel.app")
    if not resolved.is_production:
        allowed_origins.add("http://localhost:3000")
        allowed_origins.add("http://127.0.0.1:3000")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=sorted(list(allowed_origins)),
        allow_origin_regex=r"^https://([a-zA-Z0-9_-]+\.)*(aivon\.io|vercel\.app)$",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
    )

    from app.routers import (
        account,
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

    app.include_router(account.router)
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

    return app
