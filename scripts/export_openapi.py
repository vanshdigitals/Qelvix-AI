"""Export the FastAPI OpenAPI schema to the committed snapshot.

Gate G6 (08 §12.1, §6.1): the snapshot in docs/contracts/openapi.json is the
single source of API shape. CI re-runs this script and fails if the result
differs from what is committed, which is what makes frontend/backend drift
structurally impossible rather than merely discouraged.

Runs offline — the app object is constructed in-process, no server is started.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND = REPO_ROOT / "backend"
SNAPSHOT = REPO_ROOT / "docs" / "contracts" / "openapi.json"

sys.path.insert(0, str(BACKEND))

from app.config import Settings  # noqa: E402
from app.main import create_app  # noqa: E402

# Fixed, non-secret settings so the exported schema depends only on the code,
# never on the developer's environment. Two machines must produce byte-identical
# output or the snapshot diff is meaningless.
EXPORT_SETTINGS = Settings(
    nvidia_api_key="contract-export",  # type: ignore[arg-type]
    database_url="postgresql+asyncpg://contract:contract@localhost:5432/contract",
    supabase_url="http://localhost",
    supabase_service_key="contract-export",  # type: ignore[arg-type]
    redis_url="redis://localhost:6379/0",
    secret_key="contract-export",  # type: ignore[arg-type]
    frontend_url="http://localhost:3000",
    environment="development",
)


def export() -> dict[str, Any]:
    app = create_app(settings=EXPORT_SETTINGS)
    return app.openapi()


def main() -> int:
    schema = export()
    SNAPSHOT.parent.mkdir(parents=True, exist_ok=True)
    # sort_keys and a trailing newline keep the diff stable across runs.
    SNAPSHOT.write_text(
        json.dumps(schema, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    sys.stdout.write(f"Wrote {SNAPSHOT.relative_to(REPO_ROOT)}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
