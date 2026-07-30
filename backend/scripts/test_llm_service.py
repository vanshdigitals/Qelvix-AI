import asyncio
import json
import sys
import os

# Add backend to path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.claude_service import (
    explain_finding,
    generate_remediation,
    generate_whatsapp_summary,
    tailor_ir_playbook
)

async def main():
    finding = {
        "id": "ssl-01",
        "finding_type": "ssl_expired",
        "title": "SSL Certificate Expired",
        "severity": "high",
        "evidence": {
            "domain": "example.com",
            "expired_on": "2023-10-01",
            "days_overdue": 15
        }
    }

    org_context = {
        "name": "Acme Corp",
        "industry": "E-commerce",
        "technical_capability": "low"
    }

    scan_result = {
        "risk_score": 85,
        "critical_findings": 0,
        "high_findings": 1,
        "top_issues": ["SSL Certificate Expired on example.com"]
    }

    playbook = {
        "id": "ssl_expired",
        "name": "SSL Certificate Expired",
        "description": "The SSL certificate for the domain has expired.",
        "steps": [
            "Identify the domain registrar or hosting provider.",
            "Renew the SSL certificate.",
            "Install the new certificate on the web server."
        ]
    }

    print("=== EXPLAIN FINDING ===")
    explanation = await explain_finding(finding, org_context)
    print(explanation)
    print("\n" + "="*40 + "\n")

    print("=== GENERATE REMEDIATION ===")
    remediation = await generate_remediation(finding)
    print(remediation)
    print("\n" + "="*40 + "\n")

    print("=== GENERATE WHATSAPP SUMMARY ===")
    whatsapp = await generate_whatsapp_summary(scan_result, org_context)
    print(whatsapp)
    print("\n" + "="*40 + "\n")

    print("=== TAILOR IR PLAYBOOK ===")
    tailored = await tailor_ir_playbook(playbook, finding, org_context)
    print(tailored)
    print("\n" + "="*40 + "\n")

if __name__ == "__main__":
    asyncio.run(main())
