from fastapi import FastAPI
from sqlalchemy import text
from starlette.middleware.sessions import SessionMiddleware

from .config import get_settings
from .db import engine
from .routers import auth, elements

settings = get_settings()

app = FastAPI(title="Element Quest API", version="0.1.0", docs_url="/api/docs", openapi_url="/api/openapi.json")
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.secret_key,
    session_cookie="eq_session",
    max_age=settings.session_days * 24 * 3600,
    same_site="lax",
    https_only=False,  # home network over plain HTTP; see README for HTTPS
)
app.include_router(auth.router)
app.include_router(elements.router)


@app.get("/api/health", tags=["health"])
def health() -> dict[str, str]:
    with engine.connect() as conn:
        conn.execute(text("select 1"))
    return {"status": "ok"}
