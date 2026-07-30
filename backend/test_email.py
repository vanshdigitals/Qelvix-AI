from app.services.email_service import send_scan_report_email

def test_email():
    scan_result = {
        "risk_score": 85,
        "risk_band": "Critical",
        "risk_executive_summary": "We found several critical issues that require immediate attention."
    }
    
    # Passing a dummy email to see if it tries to send
    # If RESEND_API_KEY is empty, it will just print the stub message
    send_scan_report_email("test@example.com", "Test Org", scan_result, "http://localhost:3000/dashboard")

if __name__ == "__main__":
    test_email()
