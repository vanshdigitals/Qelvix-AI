import pytest
from unittest.mock import AsyncMock, patch
from app.services.claude_service import (
    explain_finding,
    generate_remediation,
    generate_whatsapp_summary,
    tailor_ir_playbook
)
import openai

# A mock response to simulate OpenAI's structure
class MockMessage:
    def __init__(self, content):
        self.content = content

class MockChoice:
    def __init__(self, content):
        self.message = MockMessage(content)

class MockResponse:
    def __init__(self, content):
        self.choices = [MockChoice(content)]

@pytest.fixture
def mock_openai_create():
    with patch("app.services.claude_service.client.chat.completions.create", new_callable=AsyncMock) as mock_create:
        mock_create.return_value = MockResponse("mocked response")
        yield mock_create

@pytest.mark.asyncio
async def test_explain_finding_success(mock_openai_create):
    finding = {"id": "123", "type": "ssl_expired"}
    org_context = {"name": "Test Org"}
    
    result = await explain_finding(finding, org_context)
    
    assert result == "mocked response"
    mock_openai_create.assert_called_once()
    kwargs = mock_openai_create.call_args.kwargs
    assert kwargs["model"] == "deepseek-ai/deepseek-v4-flash"
    assert len(kwargs["messages"]) == 2
    assert "ssl_expired" in kwargs["messages"][1]["content"]

@pytest.mark.asyncio
async def test_generate_remediation_success(mock_openai_create):
    finding = {"id": "123", "type": "ssl_expired"}
    
    result = await generate_remediation(finding)
    
    assert result == "mocked response"
    mock_openai_create.assert_called_once()
    kwargs = mock_openai_create.call_args.kwargs
    assert kwargs["model"] == "deepseek-ai/deepseek-v4-flash"
    assert len(kwargs["messages"]) == 2

@pytest.mark.asyncio
async def test_generate_whatsapp_summary_success(mock_openai_create):
    scan = {"risk_score": 90}
    org = {"name": "Test Org"}
    
    result = await generate_whatsapp_summary(scan, org)
    
    assert result == "mocked response"
    mock_openai_create.assert_called_once()
    kwargs = mock_openai_create.call_args.kwargs
    assert kwargs["model"] == "deepseek-ai/deepseek-v4-flash"
    assert len(kwargs["messages"]) == 1

@pytest.mark.asyncio
async def test_tailor_ir_playbook_success(mock_openai_create):
    playbook = {"id": "ssl_expired"}
    finding = {"id": "123"}
    org_context = {"name": "Test Org"}
    
    result = await tailor_ir_playbook(playbook, finding, org_context)
    
    assert result == "mocked response"
    mock_openai_create.assert_called_once()
    kwargs = mock_openai_create.call_args.kwargs
    assert kwargs["model"] == "deepseek-ai/deepseek-v4-flash"
    assert len(kwargs["messages"]) == 2

@pytest.mark.asyncio
async def test_error_handling():
    # Currently claude_service.py has no try/except blocks.
    # We verify that it raises the exception directly.
    with patch("app.services.claude_service.client.chat.completions.create", new_callable=AsyncMock) as mock_create:
        mock_create.side_effect = openai.APITimeoutError(request=None)
        
        with pytest.raises(openai.APITimeoutError):
            await explain_finding({}, {})
