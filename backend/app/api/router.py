from fastapi import APIRouter

from app.api.routes import food_entries, health

# Aggregates all v1 routers. New resource routers (food-entries, auth, ...)
# get included here as the application grows.
api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(food_entries.router)
