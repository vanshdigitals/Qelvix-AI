import json
from openai import AsyncOpenAI
from app.config import get_settings

settings = get_settings()

client = AsyncOpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=settings.nvidia_api_key.get_secret_value()
)

MODEL_NAME = "deepseek-ai/deepseek-v4-flash"

async def explain_finding(finding: dict, org_context: dict) -> str:
    """Called ONLY after deterministic rules fire. Never decides severity."""
    response = await client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {
                "role": "system",
                "content": "You are a cybersecurity expert explaining a finding to a business owner. Keep it plain English, avoid jargon, and be concise."
            },
            {
                "role": "user",
                "content": f"Explain this finding:\n{json.dumps(finding, indent=2)}\n\nOrganization Context:\n{json.dumps(org_context, indent=2)}"
            }
        ],
        temperature=0.0
    )
    return response.choices[0].message.content

async def generate_remediation(finding: dict) -> str:
    """Write owner-friendly fix steps for a specific finding."""
    response = await client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {
                "role": "system",
                "content": "You are a cybersecurity expert providing remediation steps. If a vendor needs to be contacted, say so explicitly rather than implying the user can self-serve the fix."
            },
            {
                "role": "user",
                "content": f"Provide step-by-step remediation for this finding:\n{json.dumps(finding, indent=2)}"
            }
        ],
        temperature=0.0
    )
    return response.choices[0].message.content

async def generate_whatsapp_summary(scan_result: dict, org: dict) -> str:
    """Compress full scan into <160-word WhatsApp message."""
    response = await client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {
                "role": "user",
                "content": f"""Write a WhatsApp message (max 160 words) for a business owner about their
security scan. Include: risk score, top 2-3 issues, one urgent action.
End with the dashboard link placeholder {{report_url}}.

Scan Result: {json.dumps(scan_result)}
Organization: {json.dumps(org)}"""
            }
        ],
        temperature=0.0
    )
    return response.choices[0].message.content

async def tailor_ir_playbook(playbook: dict, finding: dict, org_context: dict) -> str:
    """Select and tailor the relevant playbook to the org's context."""
    response = await client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {
                "role": "system",
                "content": "You are an incident response expert. Tailor the provided IR playbook to the organization's context and the specific finding."
            },
            {
                "role": "user",
                "content": f"Playbook:\n{json.dumps(playbook, indent=2)}\n\nFinding:\n{json.dumps(finding, indent=2)}\n\nOrganization Context:\n{json.dumps(org_context, indent=2)}"
            }
        ],
        temperature=0.0
    )
    return response.choices[0].message.content
