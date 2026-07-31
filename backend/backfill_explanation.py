import asyncio
from app.database import get_db_session
from app.models.scan import Finding
from app.models.org import Organization
from sqlalchemy import select
from app.services.claude_service import explain_finding

async def backfill():
    session_gen = get_db_session()
    db = await anext(session_gen)
    
    # Find the stale finding using LIKE
    stmt = select(Finding).where(Finding.plain_explanation.like("AI service temporarily%")).limit(1)
    result = await db.execute(stmt)
    finding = result.scalars().first()
    
    if finding:
        print(f"Found stale finding: {finding.id} ({finding.title})")
        print(f"Old explanation: {finding.plain_explanation}")
        
        # Get org context
        stmt_org = select(Organization).where(Organization.id == finding.org_id)
        org = (await db.execute(stmt_org)).scalars().first()
        org_context = {"name": org.name, "primary_domain": org.primary_domain, "plan": org.plan}
        
        finding_dict = {
            "type": finding.finding_type,
            "severity": finding.severity,
            "title": finding.title,
            "evidence": finding.raw_data
        }
        
        print("Regenerating explanation...")
        new_explanation = await explain_finding(finding_dict, org_context)
        print(f"New explanation:\n{new_explanation}")
        
        finding.plain_explanation = new_explanation
        await db.commit()
        print("Saved to DB!")
    else:
        print("No stale findings found.")
        
    await session_gen.aclose()

if __name__ == '__main__':
    asyncio.run(backfill())

