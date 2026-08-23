from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings.

    For now these are sensible development defaults. Full environment-variable
    wiring (.env files, per-environment values) lands in Phase 3.
    """

    model_config = SettingsConfigDict(env_prefix="", env_file=".env", extra="ignore")

    # All v1 API routes live under this prefix.
    api_v1_prefix: str = "/api/v1"

    # Origins allowed to make browser requests to the API (Pattern A:
    # the browser at :5173 calls FastAPI at :8000 directly).
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


settings = Settings()
