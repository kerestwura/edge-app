from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, Request, Response, HTTPException
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from datetime import datetime, timezone, timedelta
import uuid
from pydantic import BaseModel
from typing import Optional
import jwt as pyjwt
import httpx

from database import db, client
from auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    set_auth_cookies, get_current_user, get_jwt_secret, JWT_ALGORITHM
)
from routes.trade_routes import router as trade_router
from routes.ai_routes import router as ai_router

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trade_router, prefix="/api")
app.include_router(ai_router, prefix="/api")


# --- Auth Models ---
class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleSessionRequest(BaseModel):
    session_id: str


def format_user(user: dict) -> dict:
    return {k: v for k, v in user.items() if k not in ("password_hash", "_id")}


# --- Auth Routes ---
@app.post("/api/auth/register")
async def register(req: RegisterRequest, response: Response):
    email = req.email.strip().lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": email,
        "name": req.name.strip(),
        "password_hash": hash_password(req.password),
        "picture": None,
        "auth_provider": "local",
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)

    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)

    return format_user(user_doc)


@app.post("/api/auth/login")
async def login(req: LoginRequest, request: Request, response: Response):
    email = req.email.strip().lower()

    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier}, {"_id": 0})
    if attempt and attempt.get("attempts", 0) >= 5:
        locked_until = attempt.get("locked_until")
        if locked_until:
            if isinstance(locked_until, str):
                locked_until = datetime.fromisoformat(locked_until)
            if locked_until.tzinfo is None:
                locked_until = locked_until.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) < locked_until:
                raise HTTPException(status_code=429, detail="Too many attempts. Try again in 15 minutes.")
            else:
                await db.login_attempts.delete_one({"identifier": identifier})

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not user.get("password_hash"):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {
                "$inc": {"attempts": 1},
                "$set": {
                    "locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat(),
                    "last_attempt": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(req.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {
                "$inc": {"attempts": 1},
                "$set": {
                    "locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat(),
                    "last_attempt": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.login_attempts.delete_many({"identifier": identifier})

    access_token = create_access_token(user["id"], email)
    refresh_token = create_refresh_token(user["id"])
    set_auth_cookies(response, access_token, refresh_token)

    return format_user(user)


@app.get("/api/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user


@app.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}


@app.post("/api/auth/refresh")
async def refresh_token_endpoint(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = pyjwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        new_access = create_access_token(user["id"], user["email"])
        response.set_cookie(
            key="access_token", value=new_access,
            httponly=True, secure=False, samesite="lax", max_age=3600, path="/"
        )
        return {"message": "Token refreshed"}
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@app.post("/api/auth/google-session")
async def google_session(req: GoogleSessionRequest, response: Response):
    try:
        async with httpx.AsyncClient() as http_client:
            res = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": req.session_id}
            )
            if res.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            session_data = res.json()
    except httpx.HTTPError:
        raise HTTPException(status_code=500, detail="Failed to verify Google session")

    email = session_data["email"].lower()
    name = session_data.get("name", "")
    picture = session_data.get("picture", "")

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user_id = str(uuid.uuid4())
        user_doc = {
            "id": user_id,
            "email": email,
            "name": name,
            "password_hash": None,
            "picture": picture,
            "auth_provider": "google",
            "role": "user",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user_doc)
        user = {k: v for k, v in user_doc.items() if k != "_id"}
    else:
        if picture and picture != user.get("picture"):
            await db.users.update_one({"id": user["id"]}, {"$set": {"picture": picture}})
            user["picture"] = picture

    access_token = create_access_token(user["id"], email)
    refresh_token = create_refresh_token(user["id"])
    set_auth_cookies(response, access_token, refresh_token)

    return format_user(user)



# --- Profile ---
class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    default_market: Optional[str] = None
    default_timeframe: Optional[str] = None
    trading_style: Optional[str] = None
    risk_per_trade: Optional[float] = None
    max_daily_trades: Optional[int] = None
    strategies: Optional[list] = None


@app.get("/api/profile")
async def get_profile(request: Request):
    user = await get_current_user(request)
    profile = await db.profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    return {**user, "profile": profile or {}}


@app.put("/api/profile")
async def update_profile(req: ProfileUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    if "name" in update_data:
        await db.users.update_one({"id": user["id"]}, {"$set": {"name": update_data.pop("name")}})
    if update_data:
        await db.profiles.update_one(
            {"user_id": user["id"]},
            {"$set": {**update_data, "user_id": user["id"]}},
            upsert=True
        )
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    updated_user.pop("password_hash", None)
    profile = await db.profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    return {**updated_user, "profile": profile or {}}



# --- Startup / Shutdown ---
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.trades.create_index("user_id")
    await db.trades.create_index("id", unique=True)
    await db.login_attempts.create_index("identifier")

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@traderdna.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        admin_doc = {
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Admin",
            "password_hash": hash_password(admin_password),
            "picture": None,
            "auth_provider": "local",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(admin_doc)
        logger.info(f"Admin user seeded: {admin_email}")
    elif existing.get("password_hash") and not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info("Admin password updated")

    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n")
        f.write(f"## Admin\n- Email: {admin_email}\n- Password: {admin_password}\n- Role: admin\n\n")
        f.write(f"## Auth Endpoints\n- POST /api/auth/register\n- POST /api/auth/login\n")
        f.write(f"- POST /api/auth/logout\n- GET /api/auth/me\n- POST /api/auth/refresh\n")
        f.write(f"- POST /api/auth/google-session\n")

    logger.info("Startup complete")


@app.on_event("shutdown")
async def shutdown():
    client.close()


@app.get("/api/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}
