from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings

# API conventions (see buildplan.md, Phase 2 Step 9):
#   - All routes are prefixed with /api/v1.
#   - JSON uses snake_case; dates are ISO 8601; timestamps stored in UTC.
#   - Ownership always comes from the authenticated user, never a
#     browser-supplied user_id.
#   - Browser talks to FastAPI directly (Pattern A).

app = FastAPI(title="Ikemen ni Naru API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)
