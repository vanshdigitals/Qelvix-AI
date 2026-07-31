import json
import asyncio
import logging
from openai import AsyncOpenAI, InternalServerError, APITimeoutError
from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# NVIDIA NIM primary. Kept per the 03 §9 architecture, but fail-fast: this model
# id currently hangs on NVIDIA NIM, so a short timeout with no SDK retries lets
# the Gemini fallback take over in seconds instead of ~70s of dead waiting.
client = AsyncOpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=settings.nvidia_api_key.get_secret_value(),
    timeout=8.0,
    max_retries=0,
)

MODEL_NAME = "deepseek-ai/deepseek-v4-flash"

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
# gemini-flash-latest resolves to the current Flash model and is reachable by
# both keys' projects. The previous "gemini-2.0-flash" has zero free-tier quota
# (HTTP 429) and "gemini-1.5-flash" is retired (HTTP 404) — that model name, not
# the keys, was why the fallback always failed.
GEMINI_MODEL_NAME = "gemini-flash-latest"


def _gemini_clients() -> list[AsyncOpenAI]:
    """Ordered Gemini fallback chain: primary key, then backup key, then the
    legacy single key — de-duplicated, skipping any that are unset."""
    ordered: list[AsyncOpenAI] = []
    seen: set[str] = set()
    for k in (
        settings.gemini_primary_api_key,
        settings.fallback_backup_gemini_primary_api_key,
        settings.gemini_api_key,
    ):
        if k:
            v = k.get_secret_value()
            if v and v not in seen:
                seen.add(v)
                ordered.append(AsyncOpenAI(base_url=GEMINI_BASE_URL, api_key=v, timeout=15.0))
    return ordered


gemini_clients = _gemini_clients()


async def _call_gemini(messages: list) -> str:
    """Fallback to Gemini, trying each configured key in order (primary -> backup).

    A key that fails for any reason (quota, auth, model access) is skipped and the
    next key is tried before giving up.
    """
    if not gemini_clients:
        raise Exception("Gemini fallback triggered but no Gemini API key is configured.")

    last_err: Exception | None = None
    for i, gc in enumerate(gemini_clients):
        try:
            response = await gc.chat.completions.create(
                model=GEMINI_MODEL_NAME,
                messages=messages,
                temperature=0.0,
            )
            logger.info(f"LLM call served by Gemini key #{i + 1} ({GEMINI_MODEL_NAME})")
            return response.choices[0].message.content
        except Exception as e:
            logger.warning(f"[Gemini key #{i + 1}] failed: {str(e)[:150]}. Trying next key.")
            last_err = e
    raise Exception(f"All Gemini keys failed. Last error: {last_err}")

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
        except APITimeoutError:
            # A hung NVIDIA request won't recover within this call — go straight
            # to the Gemini fallback instead of burning another timeout.
            logger.error("[NVIDIA] Timeout. Falling back to Gemini.")
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
        if not gemini_clients:
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
