import os
import logging
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from pymongo import ASCENDING, DESCENDING, IndexModel

from core import db, client
from auth_routes import router as auth_router, seed_admin
from game_routes import router as game_router

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

INDEXES = {
    "users": [IndexModel([("email", ASCENDING)], name="email", unique=True),
              IndexModel([("user_id", ASCENDING)], name="user_id", unique=True)],
    "user_sessions": [IndexModel([("session_token", ASCENDING)], name="session_token")],
    "login_attempts": [IndexModel([("identifier", ASCENDING)], name="identifier")],
    "games": [IndexModel([("game_id", ASCENDING)], name="game_id", unique=True),
              IndexModel([("room_code", ASCENDING)], name="room_code"),
              IndexModel([("case_id", ASCENDING), ("status", ASCENDING)], name="case_status"),
              IndexModel([("members.user_id", ASCENDING), ("updated_at", DESCENDING)], name="member_updated")],
    "password_reset_tokens": [IndexModel([("token_hash", ASCENDING)], name="token_hash"),
                              IndexModel([("expires_at", ASCENDING)], name="expires_ttl", expireAfterSeconds=86400)],
    "hints": [IndexModel([("game_id", ASCENDING), ("created_at", ASCENDING)], name="game_created")],
}

app = FastAPI(title="THE UNKNOWN")
app.include_router(auth_router)
app.include_router(game_router)


@app.get("/api/")
async def root():
    return {"message": "THE UNKNOWN"}


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    for collection, models in INDEXES.items():
        for model in models:
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:
                logger.error("index %s.%s: %s", collection, model.document["name"], exc)
    await seed_admin()


@app.on_event("shutdown")
async def shutdown():
    client.close()
