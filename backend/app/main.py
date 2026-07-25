from fastapi import FastAPI

app = FastAPI(title="Ikemen ni Naru API")


@app.get("/api/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
