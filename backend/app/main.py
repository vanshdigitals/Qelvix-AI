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
        auth, org, members, scans, findings, compliance, dashboard, notifications, webhooks
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
        return HealthResponse(status="ok", environment=resolved.environment)

    return app
