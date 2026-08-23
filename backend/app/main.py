import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings

logger = logging.getLogger("app")

# API conventions (see buildplan.md, Phase 2 Step 9):
#   - All routes are prefixed with /api/v1.
#   - JSON uses snake_case; dates are ISO 8601; timestamps stored in UTC.
#   - Ownership always comes from the authenticated user, never a
#     browser-supplied user_id.
#   - Browser talks to FastAPI directly (Pattern A).

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Configure root logging once, at startup, from the configured level.
    logging.basicConfig(
        level=settings.log_level.upper(),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    # Log startup context — but never secrets or DB credentials.
    logger.info(
        "Starting %s (environment=%s, debug=%s, log_level=%s)",
        app.title,
        settings.environment,
        settings.debug,
        settings.log_level,
    )
    yield
    logger.info("Shutting down %s", app.title)


app = FastAPI(title="Ikemen ni Naru API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)
