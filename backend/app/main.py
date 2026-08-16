from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import BASE_DIR
from .database import init_db
from .routes import auth, logs, recognition, settings, stats, users

app = FastAPI(title="Face Identification System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# static uploads
app.mount(
    "/static",
    StaticFiles(directory=str(BASE_DIR / "static")),
    name="static",
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(recognition.router)
app.include_router(logs.router)
app.include_router(stats.router)
app.include_router(settings.router)


@app.on_event("startup")
def on_startup():
    init_db()
    from .database import SessionLocal
    from .routes.auth import ensure_default_admin

    db = SessionLocal()
    try:
        ensure_default_admin(db)
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "face-identification-api"}


# ---- Serve the built React frontend (production single-service deploy) ----
DIST_DIR = Path(BASE_DIR.parent / "frontend" / "dist")


def _serve_frontend(path: str = ""):
    index = DIST_DIR / "index.html"
    file = DIST_DIR / path.lstrip("/")
    if path and file.is_file():
        return FileResponse(file)
    if index.exists():
        return FileResponse(index)  # SPA fallback -> React Router handles the route
    from fastapi.responses import JSONResponse

    return JSONResponse(
        {"detail": "Frontend not built. Run: cd frontend && npm run build"},
        status_code=404,
    )


if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")


@app.get("/{full_path:path}", include_in_schema=False)
def spa(full_path: str):
    if full_path.startswith("api/"):
        from fastapi.responses import JSONResponse

        return JSONResponse({"detail": "Not found"}, status_code=404)
    return _serve_frontend(full_path)
