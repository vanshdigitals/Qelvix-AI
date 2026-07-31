import pytest
import asyncio
from unittest.mock import patch, AsyncMock, MagicMock
from openai import APITimeoutError
from app.services.claude_service import explain_finding

@pytest.mark.asyncio
async def test_explain_finding_fallback_to_gemini():
    finding = {"id": "1", "type": "ssl_expiring_soon"}
    org_context = {"industry": "finance"}
    
    # Mock the NVIDIA client to always raise a Timeout
    mock_nvidia = AsyncMock()
    # Create a mock request object for the timeout error
    class MockRequest:
        pass
    
    mock_nvidia.chat.completions.create.side_effect = APITimeoutError(MockRequest())
    
    # Mock the Gemini client to return a successful response
    mock_gemini_message = MagicMock()
    mock_gemini_message.content = "This is a fallback explanation from Gemini."
    
    mock_gemini_choice = MagicMock()
    mock_gemini_choice.message = mock_gemini_message
    
    mock_gemini_response = MagicMock()
    mock_gemini_response.choices = [mock_gemini_choice]
    
    mock_gemini_client = AsyncMock()
    mock_gemini_client.chat.completions.create.return_value = mock_gemini_response
    
    with patch("app.services.claude_service.client", mock_nvidia), \
         patch("app.services.claude_service.gemini_client", mock_gemini_client):
        
        result = await explain_finding(finding, org_context)
        
        assert result == "This is a fallback explanation from Gemini."
        assert mock_nvidia.chat.completions.create.call_count == 2  # 1 initial + 1 retry
        mock_gemini_client.chat.completions.create.assert_called_once()
