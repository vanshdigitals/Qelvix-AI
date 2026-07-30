from openai import AsyncOpenAI
import json

from app.config import get_settings

settings = get_settings()

client = AsyncOpenAI(
    api_key=settings.nvidia_api_key.get_secret_value(),
    base_url="https://integrate.api.nvidia.com/v1"
)

MODEL = "meta/llama-3.1-405b-instruct" # Since deepseek-v4-flash is not available on nvidia nim yet, fallback to llama or let's just stick to the prompt structure

async def explain_finding(finding: dict, org_context: dict) -> str:
    """Called ONLY after deterministic rules fire. Never decides severity."""
    response = await client.chat.completions.create(
        model=MODEL,
        max_tokens=350,
        messages=[
            {"role": "system", "content": (
                "You are a cybersecurity advisor explaining findings to Indian MSME "
                "business owners with no technical background. Be concise, practical, "
                "and never alarming beyond what the evidence shows. "
                "Respond only about what is in the finding data provided."
            )},
            {"role": "user", "content": f"""
Explain this security finding in 2-3 plain-English sentences suitable for a
business owner. Include: what was found, what business risk it creates, and
the urgency of fixing it.

Organisation type: {org_context.get('industry', 'small business')}
Finding Type: {finding.get('finding_type')}
Severity: {finding.get('severity')}
Evidence: {finding.get('raw_data')}

Do NOT add findings not in the evidence. Speak directly to the owner.
"""}
        ]
    )
    return response.choices[0].message.content

async def generate_remediation(finding: dict) -> str:
    """Write owner-friendly fix steps for a specific finding."""
    response = await client.chat.completions.create(
        model=MODEL,
        max_tokens=400,
        messages=[
            {"role": "system", "content": (
                "You write simple, numbered fix steps for MSME owners with "
                "basic technical staff. Steps must be actionable by a web developer "
                "or IT admin, not a security expert. Max 5 steps."
            )},
            {"role": "user", "content": f"""
Write 3-5 numbered steps to fix this issue. Use plain language.
If a vendor needs to be contacted, say so. Include estimated time to fix.

Finding: {finding.get('finding_type')}
Title: {finding.get('title')}
Raw Data: {finding.get('raw_data')}
"""}
        ]
    )
    return response.choices[0].message.content

async def generate_whatsapp_summary(scan_result: dict, org: dict) -> str:
    """Compress full scan into <160-word WhatsApp message."""
    response = await client.chat.completions.create(
        model=MODEL,
        max_tokens=250,
        messages=[
            {"role": "user", "content": f"""
Write a WhatsApp message (max 160 words) for a business owner about their
security scan. Include: risk score, top 2-3 issues, one urgent action.
End with the dashboard link placeholder {{report_url}}.

Org: {org.get('name')}
Risk Score: {scan_result.get('risk_score')}/100 ({scan_result.get('risk_band')})
Critical: {scan_result.get('findings_summary', {}).get('critical', 0)}
High: {scan_result.get('findings_summary', {}).get('high', 0)}
Top Issues: {scan_result.get('top_findings')}
"""}
        ]
    )
    return response.choices[0].message.content

async def generate_executive_summary(scan_result: dict) -> str:
    """Generate risk score executive summary."""
    response = await client.chat.completions.create(
        model=MODEL,
        max_tokens=150,
        messages=[
            {"role": "user", "content": f"""
Write a 2-sentence executive summary for a risk report based on these scores.
Score: {scan_result.get('risk_score')}/100
Band: {scan_result.get('risk_band')}
"""}
        ]
    )
    return response.choices[0].message.content

async def generate_dpdp_narrative(clauses: list[dict]) -> str:
    """Generate DPDP narrative."""
    response = await client.chat.completions.create(
        model=MODEL,
        max_tokens=250,
        messages=[
            {"role": "system", "content": "Always include a disclaimer that this is a readiness indicator, not legal certification."},
            {"role": "user", "content": f"""
Summarize this DPDP readiness state in 2 paragraphs.
Clauses: {json.dumps(clauses, indent=2)}
"""}
        ]
    )
    return response.choices[0].message.content
