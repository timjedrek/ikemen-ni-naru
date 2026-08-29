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

    Lifecycle (buildplan Step 16):
      1. open a session
      2. yield it to the route/repository
      3. commit if the request handler returned normally
      4. roll back if it raised
      5. always close the session (return the connection to the pool)
    """
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
