"""Application settings.

The single point of entry for environment configuration (03 §11). No module
outside this one reads ``os.environ`` directly, so every setting has one typed,
validated definition and one place to change it.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["development", "staging", "production"]


class Settings(BaseSettings):
    """Typed view of the environment variables defined in 03 §11.

    Field names are the lowercase form of the documented SCREAMING_SNAKE_CASE
    variable names; ``pydantic-settings`` matches them case-insensitively.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="forbid",
    )

    # Anthropic — 03 §9. Consumed only by claude_service.py (INV-01).
    anthropic_api_key: SecretStr

    # Database — 03 §11
    database_url: str
    supabase_url: str
    supabase_service_key: SecretStr

    # Redis — 03 §11
    redis_url: str

    # External APIs — 03 §8. Optional until the service clients land (F6);
    # an absent key disables its provider rather than failing application start.
    shodan_api_key: SecretStr | None = None
    virustotal_api_key: SecretStr | None = None
    nvd_api_key: SecretStr | None = None
    google_safe_browsing_api_key: SecretStr | None = None
    abuseipdb_api_key: SecretStr | None = None
    phishtank_api_key: SecretStr | None = None
    security_trails_api_key: SecretStr | None = None

    # Notifications — 03 §7
    whatsapp_access_token: SecretStr | None = None
    whatsapp_phone_number_id: str | None = None
    whatsapp_business_account_id: str | None = None
    resend_api_key: SecretStr | None = None

    # App — 03 §11
    secret_key: SecretStr
    frontend_url: str
    environment: Environment = Field(default="development")

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the process-wide settings instance.

    Cached so the environment is read and validated once. Tests clear the cache
    via ``get_settings.cache_clear()`` after patching the environment.
    """
    return Settings()  # type: ignore[call-arg]  # values supplied by env/.env
