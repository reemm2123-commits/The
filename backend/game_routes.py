import os
import json
import logging
import uuid
import random
from pathlib import Path
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from starlette.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel, Field
import httpx

from core import db, now, get_current_user
from export_zip import zip_bytes

router = APIRouter(prefix="/api")
CASES = {}
for f in sorted((Path(__file__).parent / "cases").glob("*.json"), key=lambda x: json.loads(x.read_text(encoding="utf-8"))["number"]):
    data = json.loads(f.read_text(encoding="utf-8"))
    CASES[data["id"]] = data


GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse"


async def gemini_stream(system: str, text: str):
    """Streams text chunks from Google Gemini (free tier key from aistudio.google.com)."""
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY missing")
    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    body = {"system_instruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": text}]}],
            "generationConfig": {"temperature": 0.7}}
    async with httpx.AsyncClient(timeout=60) as client:
        async with client.stream("POST", GEMINI_URL.format(model=model), json=body,
                                 headers={"x-goog-api-key": key}) as resp:
            if resp.status_code != 200:
                await resp.aread()
                raise RuntimeError(f"Gemini HTTP {resp.status_code}: {resp.text[:200]}")
            async for line in resp.aiter_lines():
                if not line.startswith("data:"):
                    continue
                try:
                    data = json.loads(line[5:].strip())
                except ValueError:
                    continue
                for cand in data.get("candidates", []):
                    for part in cand.get("content", {}).get("parts", []):
                        if part.get("text") and not part.get("thought"):
                            yield part["text"]


CORRECT, WRONG, HINT_COST = 100, -25, 20
ACCUSE_OK, ACCUSE_BAD = 300, -150
MAX_TRIES = 2
CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
AR_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")


def get_case(case_id: str) -> dict:
    case = CASES.get(case_id)
    if not case:
        raise HTTPException(404, "CASE_NOT_FOUND")
    return case


def public_case(case: dict) -> dict:
    strip = ("answer", "explain")
    return {
        **{k: case[k] for k in ("id", "number", "title", "tagline", "difficulty", "duration", "cover_key",
                                "briefing", "board", "evidence", "accusation_threshold")},
        "start_tip": case.get("start_tip"),
        "briefing_image": case.get("briefing_image"),
        "hidden_slots": [{k: h[k] for k in ("id", "kind", "unlock_by", "x", "y", "rot")} for h in case["hidden_evidence"]],
        "questions": [{k: v for k, v in q.items() if k not in strip} for q in case["questions"]],
        "accusation": {k: v for k, v in case["accusation"].items() if k != "answer"},
    }


def case_summary(case: dict) -> dict:
    return {k: case[k] for k in ("id", "number", "title", "tagline", "difficulty", "duration", "cover_key")}


@router.get("/cases")
async def list_cases(user: dict = Depends(get_current_user)):
    return [case_summary(c) for c in CASES.values()]


@router.get("/cases/{case_id}")
async def case_detail(case_id: str, user: dict = Depends(get_current_user)):
    return public_case(get_case(case_id))


class CreateGameIn(BaseModel):
    case_id: str
    mode: str = Field(pattern="^(local|room)$")
    team_names: List[str] = Field(min_length=2, max_length=2)


class JoinIn(BaseModel):
    code: str = Field(min_length=4, max_length=10)


class AnswerIn(BaseModel):
    question_id: str
    answer: str = Field(max_length=200)


class AccuseIn(BaseModel):
    suspect: str
    motive: str
    method: str


class HintIn(BaseModel):
    message: str = Field(min_length=1, max_length=600)
    lang: str = "ar"
    team: Optional[int] = None


def member_team(game: dict, user_id: str):
    for m in game["members"]:
        if m["user_id"] == user_id:
            return m["team"]
    return None


def closed_questions(game: dict) -> list:
    out = []
    for qid, st in game["questions"].items():
        if st["solved_by"] is not None or all(t >= MAX_TRIES for t in st["tries"]):
            out.append(qid)
    return out


def game_view(game: dict, user_id: str) -> dict:
    case = get_case(game["case_id"])
    unlocked = [h for h in case["hidden_evidence"] if h["id"] in game["unlocked"]]
    finished = game["status"] == "finished"
    solved_explain = {q["id"]: q["explain"] for q in case["questions"] if q["id"] in closed_questions(game) or finished}
    view = {k: game[k] for k in ("game_id", "case_id", "mode", "room_code", "status", "teams", "turn", "questions",
                                 "unlocked", "winner", "solved_by", "version", "started_at", "finished_at")}
    view.update({
        "my_team": member_team(game, user_id) if game["mode"] == "room" else None,
        "is_owner": game["owner_id"] == user_id,
        "unlocked_evidence": unlocked,
        "explanations": solved_explain,
        "events": game["events"][-30:],
        "accusation_open": len(closed_questions(game)) >= case["accusation_threshold"],
        "solution": case["solution"] if finished else None,
        "accusation_answer": case["accusation"]["answer"] if finished else None,
    })
    for k in ("started_at", "finished_at"):
        if view[k] is not None and not isinstance(view[k], str):
            view[k] = view[k].isoformat()
    return view


async def load_game(game_id: str, user: dict) -> dict:
    game = await db.games.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(404, "GAME_NOT_FOUND")
    if member_team(game, user["user_id"]) is None:
        raise HTTPException(403, "NOT_A_MEMBER")
    return game


async def save_game(game: dict, prev_version: int):
    game["version"] = prev_version + 1
    game["updated_at"] = now()
    res = await db.games.replace_one({"game_id": game["game_id"], "version": prev_version}, game)
    if res.matched_count == 0:
        raise HTTPException(409, "STATE_CHANGED")


def acting_team(game: dict, user: dict) -> int:
    if game["status"] != "active":
        raise HTTPException(400, "GAME_NOT_ACTIVE")
    if game["mode"] == "room" and member_team(game, user["user_id"]) != game["turn"]:
        raise HTTPException(403, "NOT_YOUR_TURN")
    return game["turn"]


def has_action(game: dict, case: dict, team: int) -> bool:
    closed = closed_questions(game)
    if any(qid not in closed and st["tries"][team] < MAX_TRIES for qid, st in game["questions"].items()):
        return True
    return not game["teams"][team]["accused"] and len(closed) >= case["accusation_threshold"]


def pass_turn(game: dict, case: dict, team: int):
    other = 1 - team
    if has_action(game, case, other):
        game["turn"] = other
    elif has_action(game, case, team):
        game["turn"] = team
    else:
        finish(game, None)


def add_event(game: dict, kind: str, team: int, delta: int, ref: str = ""):
    game["events"].append({"id": uuid.uuid4().hex[:8], "kind": kind, "team": team, "delta": delta, "ref": ref,
                           "at": now().isoformat()})


def finish(game: dict, solved_by):
    game["status"] = "finished"
    game["solved_by"] = solved_by
    game["finished_at"] = now()
    start = game["started_at"]
    if start.tzinfo is None:
        start = start.replace(tzinfo=game["finished_at"].tzinfo)
    game["duration_s"] = int((game["finished_at"] - start).total_seconds())
    s0, s1 = game["teams"][0]["score"], game["teams"][1]["score"]
    game["winner"] = 0 if s0 > s1 else 1 if s1 > s0 else -1


async def unique_code() -> str:
    while True:
        code = "".join(random.choices(CODE_CHARS, k=6))
        if not await db.games.find_one({"room_code": code, "status": {"$ne": "finished"}}):
            return code


@router.post("/games")
async def create_game(body: CreateGameIn, user: dict = Depends(get_current_user)):
    case = get_case(body.case_id)
    names = [n.strip()[:30] or f"Team {i + 1}" for i, n in enumerate(body.team_names)]
    room = body.mode == "room"
    game = {
        "game_id": uuid.uuid4().hex, "case_id": case["id"], "mode": body.mode, "owner_id": user["user_id"],
        "room_code": await unique_code() if room else None,
        "status": "waiting" if room else "active",
        "teams": [{"name": n, "score": 0, "accused": False} for n in names],
        "members": [{"user_id": user["user_id"], "name": user.get("name"), "team": 0}],
        "turn": 0,
        "questions": {q["id"]: {"solved_by": None, "tries": [0, 0]} for q in case["questions"]},
        "unlocked": [], "events": [], "winner": None, "solved_by": None, "version": 0,
        "started_at": None if room else now(), "finished_at": None, "created_at": now(), "updated_at": now(),
    }
    await db.games.insert_one(dict(game))
    return game_view(game, user["user_id"])


@router.post("/games/join")
async def join_game(body: JoinIn, user: dict = Depends(get_current_user)):
    code = body.code.strip().upper()
    game = await db.games.find_one({"room_code": code, "status": {"$ne": "finished"}}, {"_id": 0})
    if not game:
        raise HTTPException(404, "ROOM_NOT_FOUND")
    if member_team(game, user["user_id"]) is not None:
        return game_view(game, user["user_id"])
    if any(m["team"] == 1 for m in game["members"]):
        raise HTTPException(400, "ROOM_FULL")
    v = game["version"]
    game["members"].append({"user_id": user["user_id"], "name": user.get("name"), "team": 1})
    game["status"] = "active"
    game["started_at"] = now()
    add_event(game, "joined", 1, 0)
    await save_game(game, v)
    return game_view(game, user["user_id"])


@router.get("/leaderboard/{case_id}")
async def leaderboard(case_id: str, user: dict = Depends(get_current_user)):
    get_case(case_id)
    games = await db.games.find({"case_id": case_id, "status": "finished", "solved_by": {"$ne": None}},
                                {"_id": 0, "teams": 1, "solved_by": 1, "duration_s": 1, "finished_at": 1, "mode": 1,
                                 "members.user_id": 1}).to_list(1000)
    rows = [{"team": g["teams"][g["solved_by"]]["name"], "score": g["teams"][g["solved_by"]]["score"],
             "rival": g["teams"][1 - g["solved_by"]]["name"], "duration_s": g.get("duration_s"), "mode": g["mode"],
             "date": g["finished_at"].isoformat(), "mine": any(m["user_id"] == user["user_id"] for m in g["members"])}
            for g in games]
    by_score = sorted(rows, key=lambda r: (-r["score"], r["duration_s"] or 10 ** 9))[:20]
    by_speed = sorted([r for r in rows if r["duration_s"]], key=lambda r: (r["duration_s"], -r["score"]))[:20]
    return {"top_score": by_score, "fastest": by_speed, "total_solved": len(rows)}


@router.get("/admin/export-zip")
async def export_zip(user: dict = Depends(get_current_user)):
    if user["email"] != os.environ["ADMIN_EMAIL"].lower():
        raise HTTPException(403, "ADMIN_ONLY")
    return Response(await run_in_threadpool(zip_bytes), media_type="application/zip",
                    headers={"Content-Disposition": 'attachment; filename="the-unknown.zip"'})


@router.get("/games")
async def my_games(user: dict = Depends(get_current_user)):
    games = await db.games.find({"members.user_id": user["user_id"]}, {"_id": 0}).sort("updated_at", -1).to_list(8)
    return [{"game_id": g["game_id"], "case_id": g["case_id"], "mode": g["mode"], "status": g["status"],
             "teams": g["teams"], "room_code": g["room_code"], "updated_at": g["updated_at"].isoformat()}
            for g in games]


@router.get("/games/{game_id}")
async def get_game(game_id: str, user: dict = Depends(get_current_user)):
    return game_view(await load_game(game_id, user), user["user_id"])


@router.post("/games/{game_id}/answer")
async def answer(game_id: str, body: AnswerIn, user: dict = Depends(get_current_user)):
    game = await load_game(game_id, user)
    v = game["version"]
    team = acting_team(game, user)
    case = get_case(game["case_id"])
    q = next((q for q in case["questions"] if q["id"] == body.question_id), None)
    if not q:
        raise HTTPException(404, "QUESTION_NOT_FOUND")
    st = game["questions"][q["id"]]
    if q["id"] in closed_questions(game):
        raise HTTPException(400, "QUESTION_CLOSED")
    if st["tries"][team] >= MAX_TRIES:
        raise HTTPException(400, "NO_TRIES_LEFT")
    given = body.answer.strip().translate(AR_DIGITS)
    correct = given == q["answer"]
    st["tries"][team] += 1
    delta = CORRECT if correct else WRONG
    game["teams"][team]["score"] += delta
    if correct:
        st["solved_by"] = team
    add_event(game, "answer_ok" if correct else "answer_bad", team, delta, q["id"])
    if q["id"] in closed_questions(game) and q["unlocks"] not in game["unlocked"]:
        game["unlocked"].append(q["unlocks"])
        add_event(game, "unlock", team, 0, q["unlocks"])
    pass_turn(game, case, team)
    await save_game(game, v)
    return {"correct": correct, "delta": delta, "unlocked": q["unlocks"] if q["unlocks"] in game["unlocked"] else None,
            "game": game_view(game, user["user_id"])}


@router.post("/games/{game_id}/accuse")
async def accuse(game_id: str, body: AccuseIn, user: dict = Depends(get_current_user)):
    game = await load_game(game_id, user)
    v = game["version"]
    team = acting_team(game, user)
    case = get_case(game["case_id"])
    if len(closed_questions(game)) < case["accusation_threshold"]:
        raise HTTPException(400, "ACCUSATION_LOCKED")
    if game["teams"][team]["accused"]:
        raise HTTPException(400, "ALREADY_ACCUSED")
    ans = case["accusation"]["answer"]
    correct = (body.suspect, body.motive, body.method) == (ans["suspect"], ans["motive"], ans["method"])
    delta = ACCUSE_OK if correct else ACCUSE_BAD
    game["teams"][team]["accused"] = True
    game["teams"][team]["score"] += delta
    add_event(game, "accuse_ok" if correct else "accuse_bad", team, delta)
    if correct:
        finish(game, team)
    elif all(t["accused"] for t in game["teams"]):
        finish(game, None)
    else:
        pass_turn(game, case, team)
    await save_game(game, v)
    return {"correct": correct, "delta": delta, "game": game_view(game, user["user_id"])}


@router.get("/games/{game_id}/hints")
async def list_hints(game_id: str, user: dict = Depends(get_current_user)):
    game = await load_game(game_id, user)
    query = {"game_id": game_id}
    if game["mode"] == "room":
        query["team"] = member_team(game, user["user_id"])
    return await db.hints.find(query, {"_id": 0}).sort("created_at", 1).to_list(200)


def shadow_prompt(case: dict, game: dict, lang: str) -> str:
    unlocked = set(game["unlocked"])
    visible = case["evidence"] + [h for h in case["hidden_evidence"] if h["id"] in unlocked]
    locked = [h["title"]["en"] for h in case["hidden_evidence"] if h["id"] not in unlocked]
    cards = "\n\n".join(f"[{e['title']['ar']} / {e['title']['en']}]\n{e['body']['ar']}" for e in visible)
    qs = "\n".join(
        f"- {q['title']['ar']} ({q['title']['en']}): {q['prompt']['ar']} | CORRECT: {q['answer']} | "
        f"{'SOLVED/CLOSED' if q['id'] in closed_questions(game) else 'OPEN'} | reasoning: {q['explain']['en']}"
        for q in case["questions"])
    language = "Arabic (Modern Standard, elegant, concise)" if lang == "ar" else "English"
    return f"""You are "الظل" (The Shadow), a veteran noir detective mentoring players of the murder-mystery game THE UNKNOWN, case "{case['title']['en']}".

ABSOLUTE RULES:
1. NEVER reveal the killer, motive, method, or the answer/option of any question. Never output the notebook code.
2. Never confirm or deny a guess (e.g. "Is it Layan?"). Instead redirect to a specific piece of evidence and ask a sharp question.
3. Give ONE hint per reply: name 1-2 evidence cards (by their exact titles in the reply language) worth re-reading and which kind of detail to compare (times, habits, places). Do not state the contradiction itself; let them find it. End with a short guiding question.
4. Calibrate to progress: aim your hint at the earliest OPEN question, never leap ahead to the final solution. If they ask directly "who is the killer", do not single out any suspect; tell them the killer is found by answering the open questions and point to evidence for the earliest OPEN one.
5. Only reference evidence the players can see. Do not mention or describe locked evidence: {', '.join(locked) or 'none'}.
6. Max 60 words. Plain text only, no markdown, no asterisks. Atmospheric but useful. Reply ONLY in {language}.
7. If the players ask something unrelated to the case, steer them back in one line.

VISIBLE EVIDENCE:
{cards}

QUESTIONS (CONFIDENTIAL - for you only):
{qs}

CONFIDENTIAL SOLUTION (never disclose): {case['solution']['en']}"""


@router.post("/games/{game_id}/hint")
async def hint(game_id: str, body: HintIn, user: dict = Depends(get_current_user)):
    game = await load_game(game_id, user)
    if game["status"] != "active":
        raise HTTPException(400, "GAME_NOT_ACTIVE")
    team = member_team(game, user["user_id"]) if game["mode"] == "room" else (
        body.team if body.team in (0, 1) else game["turn"])
    event = {"id": uuid.uuid4().hex[:8], "kind": "hint", "team": team, "delta": -HINT_COST, "ref": "", "at": now().isoformat()}
    await db.games.update_one({"game_id": game_id}, {"$inc": {f"teams.{team}.score": -HINT_COST, "version": 1},
                                                    "$push": {"events": event}, "$set": {"updated_at": now()}})
    case = get_case(game["case_id"])
    history = await db.hints.find({"game_id": game_id, "team": team}, {"_id": 0}).sort("created_at", -1).to_list(4)
    context = "\n".join(f"Players: {h['question']}\nShadow: {h['answer']}" for h in reversed(history))
    text = (f"Earlier conversation:\n{context}\n\nNew question from players: {body.message}" if context else body.message)
    system_prompt = shadow_prompt(case, game, body.lang)

    async def stream():
        parts = []
        try:
            async for chunk in gemini_stream(system_prompt, text):
                parts.append(chunk)
                yield f"data: {json.dumps({'delta': chunk}, ensure_ascii=False)}\n\n"
        except Exception as exc:
            logging.getLogger(__name__).error("Shadow failed: %s", exc)
            yield f"data: {json.dumps({'error': 'SHADOW_UNAVAILABLE'})}\n\n"
        reply = "".join(parts).strip()
        if not reply:
            await db.games.update_one({"game_id": game_id}, {"$inc": {f"teams.{team}.score": HINT_COST, "version": 1},
                                                            "$pull": {"events": {"id": event["id"]}}})
        else:
            await db.hints.insert_one({"hint_id": uuid.uuid4().hex, "game_id": game_id, "team": team,
                                       "user_id": user["user_id"], "question": body.message, "answer": reply,
                                       "created_at": now().isoformat()})
        yield f"data: {json.dumps({'done': True, 'team': team})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
