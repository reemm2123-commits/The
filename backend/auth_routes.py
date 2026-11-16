import os
import logging
import re
import uuid
from datetime import timedelta

import hashlib
import secrets
from html import escape

import httpx
from fastapi import APIRouter, Request, Response, HTTPException, Depends
from pydantic import BaseModel, Field

from email_service import send_email
from core import (db, now, hash_password, verify_password, create_access_token, create_refresh_token,
                  decode_token, public_user, get_current_user)

router = APIRouter(prefix="/api/auth")
logger = logging.getLogger(__name__)
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
COOKIE = dict(httponly=True, secure=True, samesite="lax", path="/")
SESSION_DATA_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    email: str = Field(max_length=200)
    password: str = Field(min_length=6, max_length=128)


class LoginIn(BaseModel):
    email: str = Field(max_length=200)
    password: str = Field(max_length=128)


class GoogleIn(BaseModel):
    session_id: str


def set_jwt_cookies(response: Response, user: dict):
    response.set_cookie("access_token", create_access_token(user["user_id"], user["email"]), max_age=900, **COOKIE)
    response.set_cookie("refresh_token", create_refresh_token(user["user_id"]), max_age=604800, **COOKIE)


@router.post("/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(400, "INVALID_EMAIL")
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "EMAIL_TAKEN")
    user = {"user_id": f"user_{uuid.uuid4().hex[:12]}", "email": email, "name": body.name.strip(),
            "picture": None, "auth_provider": "password", "password_hash": hash_password(body.password),
            "created_at": now()}
    await db.users.insert_one(user)
    set_jwt_cookies(response, user)
    return public_user(user)


@router.post("/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.strip().lower()
    ident = f"email:{email}"
    attempt = await db.login_attempts.find_one({"identifier": ident}, {"_id": 0})
    if attempt and attempt.get("count", 0) >= 5:
        locked = attempt["last"].replace(tzinfo=attempt["last"].tzinfo or now().tzinfo)
        if now() - locked < timedelta(minutes=15):
            raise HTTPException(429, "TOO_MANY_ATTEMPTS")
        await db.login_attempts.delete_one({"identifier": ident})
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(body.password, user["password_hash"]):
        await db.login_attempts.update_one({"identifier": ident}, {"$inc": {"count": 1}, "$set": {"last": now()}}, upsert=True)
        raise HTTPException(401, "INVALID_CREDENTIALS")
    await db.login_attempts.delete_one({"identifier": ident})
    set_jwt_cookies(response, user)
    return public_user(user)


@router.post("/google/session")
async def google_session(body: GoogleIn, response: Response):
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(SESSION_DATA_URL, headers={"X-Session-ID": body.session_id})
    if r.status_code != 200:
        raise HTTPException(401, "GOOGLE_SESSION_INVALID")
    data = r.json()
    email = data["email"].lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user:
        await db.users.update_one({"email": email}, {"$set": {"picture": data.get("picture") or user.get("picture"),
                                                             "name": user.get("name") or data.get("name")}})
        user = await db.users.find_one({"email": email}, {"_id": 0})
    else:
        user = {"user_id": f"user_{uuid.uuid4().hex[:12]}", "email": email, "name": data.get("name") or email,
                "picture": data.get("picture"), "auth_provider": "google", "created_at": now()}
        await db.users.insert_one(dict(user))
    await db.user_sessions.insert_one({"user_id": user["user_id"], "session_token": data["session_token"],
                                       "expires_at": now() + timedelta(days=7), "created_at": now()})
    response.set_cookie("session_token", data["session_token"], max_age=604800, **COOKIE)
    return public_user(user)


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    user_id = decode_token(token, "refresh") if token else None
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0}) if user_id else None
    if not user:
        raise HTTPException(401, "NOT_AUTHENTICATED")
    response.set_cookie("access_token", create_access_token(user["user_id"], user["email"]), max_age=900, **COOKIE)
    return public_user(user)


@router.post("/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    for name in ("access_token", "refresh_token", "session_token"):
        response.delete_cookie(name, path="/", secure=True, samesite="lax", httponly=True)
    return {"ok": True}


class ForgotIn(BaseModel):
    email: str = Field(max_length=200)
    lang: str = "ar"


class ResetIn(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    password: str = Field(min_length=6, max_length=128)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _reset_email(name: str, link: str, lang: str) -> tuple:
    brand = escape(os.environ["EMAIL_FROM_NAME"])
    if lang == "en":
        subject = f"{os.environ['EMAIL_FROM_NAME']} — reset your password"
        lines = ("Reset your password", f"Hello {escape(name)},", "We received a request to reset your detective account password. The link is valid for one hour and can be used once.",
                 "Set a new password", "If you didn't ask for this, ignore this email; your password stays the same.", "We never ask for your password by email.")
        direction = "ltr"
    else:
        subject = f"{os.environ['EMAIL_FROM_NAME']} — إعادة تعيين كلمة المرور"
        lines = ("إعادة تعيين كلمة المرور", f"مرحباً {escape(name)}،", "وصلنا طلب لإعادة تعيين كلمة مرور حسابك. الرابط صالح لمدة ساعة واحدة ولمرة واحدة فقط.",
                 "تعيين كلمة مرور جديدة", "إن لم تطلب ذلك، تجاهل هذه الرسالة وستبقى كلمة مرورك كما هي.", "لن نطلب منك كلمة المرور عبر البريد أبداً.")
        direction = "rtl"
    html = (f'<table role="presentation" width="100%" style="background:#08090B;padding:32px 0" dir="{direction}"><tr><td align="center">'
            f'<table role="presentation" width="520" style="background:#14171C;border:1px solid #2A2E3B;font-family:Arial,sans-serif;color:#F0F4F8">'
            f'<tr><td style="padding:28px 32px;border-bottom:1px solid #2A2E3B;letter-spacing:6px;font-size:14px;color:#C0C7D0" align="center">{brand}</td></tr>'
            f'<tr><td style="padding:32px"><h1 style="margin:0 0 18px;font-size:22px;color:#FFFFFF">{lines[0]}</h1>'
            f'<p style="margin:0 0 12px;color:#C0C7D0;font-size:15px">{lines[1]}</p>'
            f'<p style="margin:0 0 28px;color:#C0C7D0;font-size:15px;line-height:1.7">{lines[2]}</p>'
            f'<a href="{escape(link)}" style="display:inline-block;background:#F0F4F8;color:#08090B;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:bold">{lines[3]}</a>'
            f'<p style="margin:28px 0 0;color:#8E95A2;font-size:13px">{lines[4]}</p></td></tr>'
            f'<tr><td style="padding:18px 32px;border-top:1px solid #2A2E3B;color:#8E95A2;font-size:12px" align="center">{brand} · {lines[5]}</td></tr>'
            f'</table></td></tr></table>')
    return subject, html


@router.post("/forgot-password")
async def forgot_password(body: ForgotIn, request: Request):
    email = body.email.strip().lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not user.get("password_hash"):
        return {"ok": True}
    recent = await db.password_reset_tokens.count_documents({"user_id": user["user_id"], "created_at": {"$gt": now() - timedelta(hours=1)}})
    if recent >= 3:
        return {"ok": True}
    host = request.headers.get("x-forwarded-host") or request.headers.get("host", "")
    token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.insert_one({"token_hash": _hash_token(token), "user_id": user["user_id"], "used": False,
                                               "created_at": now(), "expires_at": now() + timedelta(hours=1)})
    subject, html = _reset_email(user.get("name") or "", f"{(os.environ.get('FRONTEND_URL') or 'https://' + host).rstrip('/')}/reset-password?token={token}", body.lang)
    try:
        await send_email(to=email, subject=subject, html=html)
    except HTTPException as exc:
        logger.error("Reset email failed for %s: %s", user["user_id"], exc.detail)
        await db.password_reset_tokens.delete_one({"token_hash": _hash_token(token)})
    return {"ok": True}


@router.post("/reset-password")
async def reset_password(body: ResetIn):
    rec = await db.password_reset_tokens.find_one({"token_hash": _hash_token(body.token)}, {"_id": 0})
    exp = rec["expires_at"].replace(tzinfo=now().tzinfo) if rec and rec["expires_at"].tzinfo is None else (rec or {}).get("expires_at")
    if not rec or rec["used"] or exp < now():
        raise HTTPException(400, "RESET_INVALID")
    await db.users.update_one({"user_id": rec["user_id"]}, {"$set": {"password_hash": hash_password(body.password)}})
    await db.password_reset_tokens.update_one({"token_hash": rec["token_hash"]}, {"$set": {"used": True}})
    return {"ok": True}


async def seed_admin():
    email = os.environ["ADMIN_EMAIL"].lower()
    if not await db.users.find_one({"email": email}):
        await db.users.insert_one({"user_id": f"user_{uuid.uuid4().hex[:12]}", "email": email, "name": "Detective",
                                   "picture": None, "auth_provider": "password",
                                   "password_hash": hash_password(os.environ["ADMIN_PASSWORD"]), "created_at": now()})
