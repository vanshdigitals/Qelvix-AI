"""Lightweight in-memory sliding-window rate limiter.

MVP-scoped: buckets live in this process's memory, which is correct for the
current single-process backend (scans run as in-process BackgroundTasks). A
horizontally-scaled / multi-instance deployment would need a shared store
(e.g. Redis) — that is a funding-phase concern, intentionally not added here.

Limits are per-organization so one tenant can't burn a shared free-tier quota
(LLM / DNS lookups) or spam expensive endpoints. Normal usage is unaffected.
"""

import time
from collections import defaultdict, deque
from typing import Annotated

from fastapi import Depends, HTTPException, status

from app.dependencies import CurrentOrg, get_current_org

_BUCKETS: dict[str, deque[float]] = defaultdict(deque)


def _hit(key: str, max_calls: int, window_seconds: int) -> None:
    now = time.monotonic()
    dq = _BUCKETS[key]
    while dq and dq[0] <= now - window_seconds:
        dq.popleft()
    if len(dq) >= max_calls:
        retry = int(window_seconds - (now - dq[0])) + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded — try again in about {retry}s.",
            headers={"Retry-After": str(retry)},
        )
    dq.append(now)


def org_rate_limit(name: str, max_calls: int, window_seconds: int):
    """FastAPI dependency enforcing a per-organization sliding-window limit."""

    async def dependency(
        current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    ) -> None:
        _hit(f"{name}:{current_org.org_id}", max_calls, window_seconds)

    return dependency
