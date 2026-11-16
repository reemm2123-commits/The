import io
import zipfile
from pathlib import Path

BACKEND = Path(__file__).parent
ROOT = BACKEND.parent
PREBUILT = BACKEND / "exports" / "the-unknown.zip"
SKIP_DIRS = {"node_modules", "__pycache__", "build", "tests", ".pytest_cache", "exports", ".git", "venv"}
SKIP_FILES = {".env"}

BACKEND_ENV = """MONGO_URL="mongodb://localhost:27017"
DB_NAME="the_unknown"
CORS_ORIGINS="http://localhost:3000"
JWT_SECRET="change-me-to-a-long-random-64-char-string"
ADMIN_EMAIL="owner@example.com"
ADMIN_PASSWORD="change-me"
EMERGENT_LLM_KEY="your-emergent-llm-key"
LLM_MODEL="gpt-6-luna"
EMERGENT_EMAIL_KEY="your-emergent-email-key"
EMAIL_FROM_NAME="THE UNKNOWN"
"""
FRONTEND_ENV = "REACT_APP_BACKEND_URL=http://localhost:8001\n"


def source_available() -> bool:
    return (ROOT / "frontend" / "src").is_dir()


def build_zip() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for part in ("backend", "frontend"):
            for f in sorted((ROOT / part).rglob("*")):
                rel = f.relative_to(ROOT)
                if f.is_dir() or f.name in SKIP_FILES or f.suffix == ".zip" or SKIP_DIRS & set(rel.parts):
                    continue
                z.write(f, f"the-unknown/{rel.as_posix()}")
        z.writestr("the-unknown/README.md", (BACKEND / "export_assets" / "README.md").read_text(encoding="utf-8"))
        z.writestr("the-unknown/backend/.env.example", BACKEND_ENV)
        z.writestr("the-unknown/frontend/.env.example", FRONTEND_ENV)
    return buf.getvalue()


def zip_bytes() -> bytes:
    if source_available():
        data = build_zip()
        PREBUILT.parent.mkdir(exist_ok=True)
        PREBUILT.write_bytes(data)
        return data
    return PREBUILT.read_bytes()


if __name__ == "__main__":
    PREBUILT.parent.mkdir(exist_ok=True)
    PREBUILT.write_bytes(build_zip())
    print(PREBUILT, PREBUILT.stat().st_size)
