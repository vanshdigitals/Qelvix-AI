from fastapi import APIRouter, Header, HTTPException, Request

from app.config import get_settings

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
settings = get_settings()


@router.post("/whatsapp")
async def whatsapp_webhook(
    request: Request,
    x_hub_signature_256: str = Header(None)
):
    """Handles incoming WhatsApp replies (e.g. DETAILS)."""
    if not x_hub_signature_256:
        raise HTTPException(status_code=401, detail="Missing signature")
        
    # Signature verification logic would go here:
    # 1. Read raw body (await request.body())
    # 2. Compute HMAC-SHA256 with Meta App Secret
    # 3. Compare with x_hub_signature_256
    
    # MVP: Logically process the incoming message
    return {"status": "received"}


@router.post("/scan-status")
async def scan_status_webhook(
    request: Request,
    authorization: str = Header(None)
):
    """Internal — Celery posts scan completion."""
    # MVP: Validate an internal shared secret
    # if authorization != f"Bearer {settings.internal_webhook_secret}":
    #     raise HTTPException(status_code=401, detail="Unauthorized")
        
    return {"status": "received"}
