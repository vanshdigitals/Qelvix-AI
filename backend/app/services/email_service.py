import resend

from app.config import get_settings

settings = get_settings()

if settings.resend_api_key:
    resend.api_key = settings.resend_api_key.get_secret_value()


def send_scan_report_email(to_email: str, org_name: str, scan_result: dict, dashboard_url: str):  # noqa
    """
    Sends the scan report via email using Resend.
    """
    if not settings.resend_api_key:
        print(f"[Email Service Stub] Would have sent report to {to_email} for {org_name}")  # noqa
        return

    score = scan_result.get("risk_score", "N/A")
    band = scan_result.get("risk_band", "N/A")
    summary = scan_result.get("risk_executive_summary", "")

    html_content = f"""
    <h2>Your Qelvix Security Scan for {org_name} is Complete</h2>
    <p><strong>Risk Score:</strong> {score}/100 ({band})</p>
    <p>{summary}</p>
    <p><a href="{dashboard_url}">View Full Dashboard</a></p>
    """

    try:
        r = resend.Emails.send(
            {
                "from": "security@qelvix.com",
                "to": to_email,
                "subject": f"Qelvix Scan Complete - {org_name} ({band})",
                "html": html_content,
            }
        )
        return r
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")  # noqa
        return None
