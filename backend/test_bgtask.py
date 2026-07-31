import asyncio
import uuid
import sys
from fastapi.testclient import TestClient
import unittest.mock as mock

# Must mock out db and auth dependencies
from app.main import create_app
from app.dependencies import get_current_org, get_db_session, CurrentOrg

class MockSession:
    async def commit(self): pass
    async def refresh(self, obj): obj.id = uuid.uuid4()
    def add(self, obj): pass
    async def get(self, *args): return None

async def mock_get_db(): yield MockSession()
def mock_get_current_org(): return CurrentOrg(user_id=uuid.uuid4(), org_id=uuid.uuid4())

# Patch require_role before router is imported
import app.dependencies
def mock_require_role(*roles):
    async def check(): pass
    return check
app.dependencies.require_role = mock_require_role

app = create_app()
app.dependency_overrides[get_db_session] = mock_get_db
app.dependency_overrides[get_current_org] = mock_get_current_org

client = TestClient(app)

with mock.patch("app.worker.execute_and_save") as mock_exec:
    print("Triggering endpoint...")
    resp = client.post("/scans/trigger")
    print(f"Status Code: {resp.status_code}")
    print(f"Response: {resp.json()}")
    print(f"Background task executed: {mock_exec.called}")
