"""Shared pytest fixtures.

Tests construct the application through ``create_app`` with explicit settings so
no test depends on the developer's ``.env`` or reaches the network (06 §12).
"""

from __future__ import annotations

from collections.abc import AsyncIterator

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.config import Settings
from app.main import create_app


@pytest.fixture(scope="session")
def settings() -> Settings:
    """Settings pointing at local test infrastructure.

    Values are non-secret and local-only; no real credential appears in the
    test suite (INV-29).
    """
    return Settings(
        anthropic_api_key="test-anthropic-key",  # type: ignore[arg-type]
        database_url="postgresql+asyncpg://qelvix:qelvix@localhost:5432/qelvix_test",
        supabase_url="http://localhost:54321",
        supabase_service_key="test-service-key",  # type: ignore[arg-type]
        redis_url="redis://localhost:6379/1",
        secret_key="test-secret-key",  # type: ignore[arg-type]
        frontend_url="http://localhost:3000",
        environment="development",
    )


@pytest.fixture()
def app(settings: Settings) -> FastAPI:
    return create_app(settings=settings)


@pytest.fixture()
async def client(app: FastAPI) -> AsyncIterator[AsyncClient]:
    """In-process HTTP client. Requests never leave the test process."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client
