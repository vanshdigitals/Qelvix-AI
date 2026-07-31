import asyncio
from app.database import get_db_session
from app.models.scan import Finding

async def test_query():
    session_gen = get_db_session()
    db = await anext(session_gen)
    from sqlalchemy import select
    
    stmt = select(Finding).where(Finding.plain_explanation.like("AI service temporarily%")).limit(5)
    result = await db.execute(stmt)
    findings = result.scalars().all()
    
    for f in findings:
        print(f.id, f.title)
    if not findings:
        print("No stale findings remain.")
        
    await session_gen.aclose()

if __name__ == '__main__':
    asyncio.run(test_query())
