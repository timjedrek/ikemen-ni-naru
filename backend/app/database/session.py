from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

# One engine per process: it owns the connection pool. The URL carries the
# +psycopg suffix so SQLAlchemy uses the psycopg 3 driver (sync).
engine = create_engine(
    settings.database_url,
    echo=settings.debug,  # log SQL in development; quiet in production
    pool_pre_ping=True,  # transparently recover from dropped connections
)

# Session factory. Sessions are created per request (see get_db) and never
# shared across requests/threads.
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    """Per-request database session (FastAPI dependency).

    Commits are the responsibility of the write operations (the CRUD layer),
    NOT this dependency. FastAPI runs a yield-dependency's teardown *after* the
    response has been sent, so committing here would land after the client
    already has its response — a fast follow-up request could then race the
    commit and not see its own write (this actually bit us: an immediate GET
    /auth/me after register returned 401 until the commit landed). Committing at
    the write site guarantees durability before the response is built.

    Lifecycle:
      1. open a session
      2. yield it to the route/repository (which commits its own writes)
      3. roll back if the handler raised (safety net for a half-done unit of work)
      4. always close the session (return the connection to the pool)
    """
    session = SessionLocal()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
