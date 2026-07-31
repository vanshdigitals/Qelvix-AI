import asyncio
from app.database import get_db_session
from app.models.scan import Finding

async def test_query():
    session_gen = get_db_session()
    db = await anext(session_gen)
    from sqlalchemy import select
    
    stmt = select(Finding).where(Finding.finding_type == 'email_breached').order_by(Finding.discovered_at.desc()).limit(3)
    result = await db.execute(stmt)
    findings = result.scalars().all()
    
    for i, f in enumerate(findings):
        print(f"\n--- Finding {i+1} ---")
        print(f"ID: {f.id}")
        print(f"Discovered: {f.discovered_at}")
        print(f"Explanation starts with: {f.plain_explanation[:50] if f.plain_explanation else 'None'}")
        
    await session_gen.aclose()

if __name__ == '__main__':
    asyncio.run(test_query())
