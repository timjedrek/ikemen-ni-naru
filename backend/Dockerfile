# Production image for the FastAPI backend.
#
# Two stages: the builder resolves dependencies from the *locked* uv.lock into a
# self-contained virtualenv; the runtime stage is a clean slim Python image that
# only carries that venv + the app code and runs as a non-root user.
#
# Nothing here is environment-specific — DATABASE_URL, SECRET_KEY, CORS_ORIGINS,
# FRONTEND_URL, ENVIRONMENT, etc. are all injected at runtime (see
# app/core/config.py). Migrations are NOT run on startup; they run as an explicit
# deploy step (see app.json -> scripts.dokku.predeploy, `alembic upgrade head`).

# --- builder: install locked deps into /app/.venv ---------------------------
FROM ghcr.io/astral-sh/uv:python3.14-bookworm-slim AS builder

# Byte-compile for faster cold starts; copy (don't hardlink) so the venv is
# self-contained and portable to the runtime stage's filesystem.
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Dependency layer first (cached across code-only changes): resolve exactly what
# uv.lock pins, no dev deps, without installing the project itself yet.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

# Then the app code + a final sync so the project is installed into the venv.
COPY . .
RUN uv sync --frozen --no-dev

# --- runtime: clean image with just the venv + code -------------------------
FROM python:3.14-slim-bookworm AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    # Put the venv on PATH so `uvicorn` / `alembic` resolve without `uv run`.
    PATH="/app/.venv/bin:$PATH"

# Run as an unprivileged user, not root.
RUN groupadd --system app && useradd --system --gid app --home-dir /app app

WORKDIR /app
COPY --from=builder --chown=app:app /app /app

USER app

# App listens on $PORT (Dokku injects it); default 8000 for local `docker run`.
EXPOSE 8000

# Worker count is env-driven (WEB_CONCURRENCY); shell form so ${...} expands.
# exec so uvicorn is PID 1 and receives signals for clean shutdown.
# --proxy-headers / --forwarded-allow-ips: nginx (Dokku) terminates TLS in
# front of us; trust X-Forwarded-Proto/For so the app sees https + real client IP.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${WEB_CONCURRENCY:-2} --proxy-headers --forwarded-allow-ips=*"]
