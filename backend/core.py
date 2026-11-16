import os
from pathlib import Path
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import bcrypt
import jwt
from fastapi import Request, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]
JWT_ALG = "HS256"


def now():
    return datetime.now(timezone.utc)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access", "exp": now() + timedelta(minutes=15)}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALG)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "type": "refresh", "exp": now() + timedelta(days=7)}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALG)


def decode_token(token: str, kind: str):
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        return None
    return payload["sub"] if payload.get("type") == kind else None


def public_user(u: dict) -> dict:
    out = {k: u.get(k) for k in ("user_id", "email", "name", "picture", "auth_provider")}
    out["is_admin"] = u.get("email") == os.environ["ADMIN_EMAIL"].lower()
    return out


async def _session_user_id(token: str):
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        return None
    exp = sess["expires_at"]
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    return sess["user_id"] if exp > now() else None


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    bearer = auth[7:] if auth.startswith("Bearer ") else None
    user_id = None
    for t in (request.cookies.get("access_token"), bearer):
        if t and (user_id := decode_token(t, "access")):
            break
    if not user_id:
        for t in (request.cookies.get("session_token"), bearer):
            if t and (user_id := await _session_user_id(t)):
                break
    if not user_id:
        raise HTTPException(status_code=401, detail="NOT_AUTHENTICATED")
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="NOT_AUTHENTICATED")
    return user
