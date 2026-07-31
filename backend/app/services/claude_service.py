import json
import asyncio
import logging
from openai import AsyncOpenAI, InternalServerError, APITimeoutError
from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

client = AsyncOpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=settings.nvidia_api_key.get_secret_value(),
    timeout=10.0
)

MODEL_NAME = "deepseek-ai/deepseek-v4-flash"

# Initialize Gemini fallback client via OpenAI compatible endpoint
gemini_client = None
if settings.gemini_api_key:
    gemini_client = AsyncOpenAI(
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        api_key=settings.gemini_api_key.get_secret_value(),
        timeout=10.0
    )

GEMINI_MODEL_NAME = "gemini-2.0-flash"

async def _call_gemini(messages: list) -> str:
    """Fallback to Gemini using the OpenAI compatible endpoint."""
    if not gemini_client:
        raise Exception("Gemini fallback triggered but GEMINI_API_KEY is not configured.")
        
    response = await gemini_client.chat.completions.create(
        model=GEMINI_MODEL_NAME,
        messages=messages,
        temperature=0.0
    )
    return response.choices[0].message.content

async def _call_llm_with_retry(messages: list) -> str:
    """Helper to wrap the LLM call with a simple retry loop for 529s, falling back to Gemini."""
    max_retries = 2
    for attempt in range(max_retries):
        try:
            response = await client.chat.completions.create(
                model=MODEL_NAME,
                messages=messages,
                temperature=0.0
            )
            logger.info(f"LLM call served by NVIDIA (Attempt {attempt+1})")
            return response.choices[0].message.content
        except InternalServerError as e:
            if e.response.status_code in (529, 500, 502, 503, 504) and attempt < max_retries - 1:
                logger.warning(f"[NVIDIA] Server Error, retrying {attempt+1}/{max_retries}...")
                await asyncio.sleep(2 ** attempt)
                continue
            logger.error(f"[NVIDIA] Exhausted retries due to Server Error. Falling back to Gemini.")
            break
        except APITimeoutError as e:
            if attempt < max_retries - 1:
                logger.warning(f"[NVIDIA] Timeout, retrying {attempt+1}/{max_retries}...")
                await asyncio.sleep(2 ** attempt)
                continue
            logger.error(f"[NVIDIA] Exhausted retries due to Timeout. Falling back to Gemini.")
            break
        except Exception as e:
            if '429' in str(e) and attempt < max_retries - 1:
                logger.warning(f"[NVIDIA] Rate limit, retrying {attempt+1}/{max_retries}...")
                await asyncio.sleep(2 ** attempt)
                continue
            logger.error(f"[NVIDIA] Unhandled error: {e}. Falling back to Gemini.")
            break
            
    # Fallback to Gemini
    try:
        if not gemini_client:
            return "AI service temporarily unavailable (NVIDIA failed and Gemini fallback not configured)."
        response_text = await _call_gemini(messages)
        logger.info("LLM call served by Gemini (Fallback)")
        return response_text
    except Exception as e:
        logger.error(f"[Gemini Fallback] Failed: {e}")
        return "AI service temporarily unavailable (both NVIDIA and fallback failed)."

async def explain_finding(finding: dict, org_context: dict) -> str:
    """Called ONLY after deterministic rules fire. Never decides severity."""
    messages=[
        {
            "role": "system",
            "content": "You are a cybersecurity expert explaining a finding to a business owner. Keep it plain English, avoid jargon, and be concise."
        },
        {
            "role": "user",
            "content": f"Explain this finding:\n{json.dumps(finding, indent=2)}\n\nOrganization Context:\n{json.dumps(org_context, indent=2)}"
        }
    ]
    return await _call_llm_with_retry(messages)

async def generate_remediation(finding: dict) -> str:
    """Write owner-friendly fix steps for a specific finding."""
    messages=[
        {
            "role": "system",
            "content": "You are a cybersecurity expert providing remediation steps. If a vendor needs to be contacted, say so explicitly rather than implying the user can self-serve the fix."
        },
        {
            "role": "user",
            "content": f"Provide step-by-step remediation for this finding:\n{json.dumps(finding, indent=2)}"
        }
    ]
    return await _call_llm_with_retry(messages)

async def generate_whatsapp_summary(scan_result: dict, org: dict) -> str:
    """Compress full scan into <160-word WhatsApp message."""
    messages=[
        {
            "role": "user",
            "content": f"Write a WhatsApp message (max 160 words) for a business owner about their\nsecurity scan. Include: risk score, top 2-3 issues, one urgent action.\nEnd with the dashboard link placeholder {{report_url}}.\n\nScan Result: {json.dumps(scan_result)}\nOrganization: {json.dumps(org)}"
        }
    ]
    return await _call_llm_with_retry(messages)

async def tailor_ir_playbook(playbook: dict, finding: dict, org_context: dict) -> str:
    """Select and tailor the relevant playbook to the org's context."""
    messages=[
        {
            "role": "system",
            "content": "You are an incident response expert. Tailor the provided IR playbook to the organization's context and the specific finding."
        },
        {
            "role": "user",
            "content": f"Playbook:\n{json.dumps(playbook, indent=2)}\n\nFinding:\n{json.dumps(finding, indent=2)}\n\nOrganization Context:\n{json.dumps(org_context, indent=2)}"
        }
    ]
    return await _call_llm_with_retry(messages)

async def generate_dpdp_narrative(clauses: dict) -> str:
    """Generate a DPDP compliance narrative based on rule evaluations."""
    messages=[
        {
            "role": "system",
            "content": "You are a legal/compliance expert. Provide a concise narrative summary of DPDP (Digital Personal Data Protection Act) readiness based on the following clause evaluations."
        },
        {
            "role": "user",
            "content": f"Evaluated Clauses:\n{json.dumps(clauses, indent=2)}"
        }
    ]
    return await _call_llm_with_retry(messages)

async def generate_executive_summary(risk_data: dict) -> str:
    """Generate a high-level executive summary of the overall risk score and findings."""
    messages=[
        {
            "role": "system",
            "content": "You are a CISO summarizing a security scan. Provide a 2-3 sentence executive summary of the risk score and primary issues."
        },
        {
            "role": "user",
            "content": f"Risk Data:\n{json.dumps(risk_data, indent=2)}"
        }
    ]
    return await _call_llm_with_retry(messages)
