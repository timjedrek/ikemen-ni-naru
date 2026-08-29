from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, loaded from environment variables / backend/.env.

    Fields without a default (secret_key, database_url) are required: if they
    are missing the app fails loudly at startup rather than running with unsafe
    defaults. Everything else has a development-friendly default.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- Application ---
    environment: str = "development"
    debug: bool = True
    log_level: str = "INFO"

    # --- API ---
    # All v1 API routes live under this prefix.
    api_v1_prefix: str = "/api/v1"

    # --- Security ---
    # No default: must be provided via env. Generate with `openssl rand -hex 32`.
    secret_key: str
    access_token_expire_minutes: int = 60

    # --- Sessions (Phase 6, opaque-token auth) ---
    # Cookie name and lifetime for the session token. The cookie is always
    # HttpOnly + SameSite=Lax; it is marked Secure only outside development so
    # local http:// dev still works while production requires https.
    session_cookie_name: str = "session"
    session_expire_days: int = 14

    @property
    def cookie_secure(self) -> bool:
        """Send the session cookie only over HTTPS outside development."""
        return self.environment != "development"

    # --- Database ---
    # No default: must be provided via env, e.g.
    #   postgresql+psycopg://health:health@localhost:5432/health
    database_url: str

    # --- Frontend / CORS ---
    frontend_url: str = "http://localhost:5173"
    # Origins allowed to make browser requests to the API (Pattern A:
    # the browser at :5173 calls FastAPI at :8000 directly).
    # NoDecode stops pydantic-settings from trying to JSON-decode this list
    # field from the env var, so the validator below can split a plain
    # comma-separated string instead.
    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors_origins(cls, value: object) -> object:
        """Accept CORS_ORIGINS as a comma-separated string in .env.

        A plain comma-separated string is friendlier to hand-edit than JSON.
        """
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()
