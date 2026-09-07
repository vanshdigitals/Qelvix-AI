import json
import re
from typing import Any

from pydantic import BaseModel, Field, field_validator

# Strict domain: labels 1–63 chars, alphabetic TLD ≥2, total ≤253. Rejects IPs,
# schemes, paths, spaces. The backend is the real gate, so it must be at least as
# strict as the client.
_DOMAIN_RE = re.compile(
    r"^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$"
)

# Only these keys may be written into onboarding_data via PATCH. Server-owned keys
# (e.g. verification_token) can never be injected by a client.
_ALLOWED_DATA_KEYS = {
    "name",
    "notification_email",
    "gst",
    "industry",
    "whatsapp_number",
    "email_only",
    "size",
    "invites",
    "country_code",
}
_MAX_DATA_BYTES = 8192

# Ordered onboarding steps. "done" is terminal (onboarding_completed=True).
# Domain verification is a hard gate: the flow cannot reach "done" without it.
ONBOARDING_STEPS: list[str] = [
    "business",
    "industry",
    "domain",
    "verify",
    "size",
    "team",
    "notify",
    "done",
]

# Steps whose completion is required before onboarding can be marked complete.
# Optional steps (industry/size/team) may be skipped; domain + verify cannot.
REQUIRED_STEPS: set[str] = {"business", "domain", "verify", "notify"}


def next_step(step: str) -> str:
    """Return the step that follows `step`, clamped to the terminal step."""
    try:
        idx = ONBOARDING_STEPS.index(step)
    except ValueError:
        return ONBOARDING_STEPS[0]
    return ONBOARDING_STEPS[min(idx + 1, len(ONBOARDING_STEPS) - 1)]


class OnboardingState(BaseModel):
    """Everything the frontend needs to resume onboarding from where it stopped."""

    org_id: str | None = None
    onboarding_completed: bool
    onboarding_step: str
    onboarding_data: dict[str, Any]
    primary_domain: str | None
    domain_verified: bool
    name: str | None
    industry: str | None
    notification_email: str | None
    whatsapp_number: str | None


class OrgBootstrapRequest(BaseModel):
    """Payload to bootstrap/create the initial organization during Step 1."""

    name: str
    notification_email: str | None = None
    gst: str | None = None
    data: dict[str, Any] = Field(default_factory=dict)


class OnboardingStepUpdate(BaseModel):
    """Persist one completed step. `data` is merged into onboarding_data."""

    step: str
    data: dict[str, Any] = Field(default_factory=dict)

    @field_validator("step")
    @classmethod
    def _known_step(cls, v: str) -> str:
        if v not in ONBOARDING_STEPS:
            raise ValueError(f"Unknown onboarding step: {v}")
        return v

    @field_validator("data")
    @classmethod
    def _sanitise_data(cls, v: dict[str, Any]) -> dict[str, Any]:
        # Drop any key not on the allowlist (blocks injecting server-owned keys
        # like verification_token), then bound the payload size.
        clean = {k: val for k, val in v.items() if k in _ALLOWED_DATA_KEYS}
        for k in ("name", "notification_email", "gst", "industry", "size", "whatsapp_number", "country_code"):
            if isinstance(clean.get(k), str) and len(clean[k]) > 254:
                raise ValueError(f"'{k}' is too long.")
        if isinstance(clean.get("invites"), list) and len(clean["invites"]) > 50:
            raise ValueError("Too many invites at once (max 50).")
        if len(json.dumps(clean)) > _MAX_DATA_BYTES:
            raise ValueError("Onboarding payload too large.")
        return clean


class DomainUpdate(BaseModel):
    """Persist the real primary domain the user will verify."""

    domain: str

    @field_validator("domain")
    @classmethod
    def _normalise(cls, v: str) -> str:
        d = v.strip().lower()
        # Strip scheme/path/trailing dot if the user pasted a URL or FQDN.
        d = d.removeprefix("https://").removeprefix("http://").split("/", 1)[0].strip().rstrip(".")
        if all(part.isdigit() for part in d.split(".") if part):
            raise ValueError("Enter a domain name, not an IP address.")
        if not _DOMAIN_RE.match(d):
            raise ValueError("Enter a valid domain, e.g. example.in — no scheme, path, or spaces.")
        return d
