from fastapi import APIRouter

from app.api.routes import auth, food_entries, health

# Aggregates all v1 routers. New resource routers get included here as the
# application grows.
api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(food_entries.router)
