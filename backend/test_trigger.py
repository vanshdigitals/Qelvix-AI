from fastapi.testclient import TestClient
from app.main import create_app
from app.dependencies import get_current_org, CurrentOrg
import uuid

app = create_app()

def override_get_current_org():
    return CurrentOrg(org_id=uuid.uuid4(), role='owner', user_id=uuid.uuid4())

app.dependency_overrides[get_current_org] = override_get_current_org

client = TestClient(app)
response = client.post('/scans/trigger')
print(f'STATUS: {response.status_code}')
print(f'BODY: {response.json()}')
