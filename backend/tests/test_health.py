"""Health endpoint tests — the harness proof for gate G2 (08 §12.1)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.unit


async def test_health_returns_ok(client: AsyncClient) -> None:
    response = await client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["environment"] == "development"


async def test_health_response_matches_declared_schema(client: AsyncClient) -> None:
    """The endpoint returns a model, not a bare dict (INV-09)."""
    response = await client.get("/health")

    body = response.json()
    assert {"status", "environment"}.issubset(set(body))
    assert isinstance(body["status"], str)
    assert isinstance(body["environment"], str)
