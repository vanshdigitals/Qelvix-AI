import asyncio
import uuid
import sys
from app.worker import run_scan_pipeline
from app.database import get_db_session
from app.models.org import Organization

def test_pipeline():
    # 1. We need an org in the DB
    async def get_org():
        session_gen = get_db_session()
        db = await anext(session_gen)
        from sqlalchemy import select
        result = await db.execute(select(Organization).limit(1))
        org = result.scalars().first()
        if not org:
            org = Organization(
                name="Test Org",
                primary_domain="example.com",
                notification_email="test@example.com",
                whatsapp_number="+1234567890"
            )
            db.add(org)
            await db.commit()
            await db.refresh(org)
        await session_gen.aclose()
        return org

    org = asyncio.run(get_org())
    org_id = str(org.id)
    scan_id = str(uuid.uuid4())
    domain = org.primary_domain
    
    print(f"Triggering pipeline for {org.name} ({domain}) - ID: {org_id}")
    
    try:
        final_state = run_scan_pipeline(org_id, scan_id, domain)
        print("\n=== PIPELINE COMPLETED ===")
        print(f"Risk Score: {final_state.get('risk_score')}")
        print(f"Risk Band: {final_state.get('risk_band')}")
        print(f"Total Findings: {len(final_state.get('all_findings', []))}")
        print(f"Notifications Sent: {final_state.get('notifications_sent')}")
    except Exception as e:
        print(f"Pipeline failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_pipeline()
