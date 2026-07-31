import pytest
import asyncio
from unittest.mock import patch, AsyncMock, MagicMock
from app.services.claude_service import explain_finding

@pytest.mark.asyncio
async def test_explain_finding_fallback_to_nvidia():
    finding = {"id": "1", "type": "ssl_expiring_soon"}
    org_context = {"industry": "finance"}
    
    # Mock Gemini to fail (primary)
    mock_gemini_client = AsyncMock()
    mock_gemini_client.chat.completions.create.side_effect = Exception("Gemini failed")
    
    # Mock NVIDIA to succeed (fallback)
    mock_nvidia = AsyncMock()
    mock_nvidia_message = MagicMock()
    mock_nvidia_message.content = "This is a fallback explanation from NVIDIA."
    mock_nvidia_choice = MagicMock()
    mock_nvidia_choice.message = mock_nvidia_message
    mock_nvidia_response = MagicMock()
    mock_nvidia_response.choices = [mock_nvidia_choice]
    mock_nvidia.chat.completions.create.return_value = mock_nvidia_response
    
    with patch("app.services.claude_service.client", mock_nvidia), \
         patch("app.services.claude_service.gemini_clients", [mock_gemini_client]):
        
        result = await explain_finding(finding, org_context)
        
        assert result == "This is a fallback explanation from NVIDIA."
        mock_gemini_client.chat.completions.create.assert_called_once()
        mock_nvidia.chat.completions.create.assert_called_once()
