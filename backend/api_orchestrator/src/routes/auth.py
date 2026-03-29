"""Auth routes (register/login/refresh/me)."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

from db import database as db_module
from src.auth.dependencies import get_current_user
from src.auth.jwt_utils import create_access_token, create_refresh_token, decode_token
from src.auth.password import hash_password, verify_password
from src.oked.checker import detect_oked

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


class ProfilePatchRequest(BaseModel):
    taxpayer_type: str | None = None
    tax_regime: str | None = None
    annual_income_kzt: float | None = None
    employees_count: int | None = None
    activity_type: str | None = None
    has_foreign_income: bool | None = None
    has_rental_income: bool | None = None
    residency_status: str | None = None


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    profile: ProfilePatchRequest | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        email = value.strip()
        if "@" not in email or "." not in email.split("@")[-1]:
            raise ValueError("Invalid email format")
        return email

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        password = value.strip()
        if not password:
            raise ValueError("Password must not be empty")
        return password

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("Name must not be empty")
        return name


class LoginRequest(BaseModel):
    email: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class AuthResponse(BaseModel):
    user_id: str
    email: str
    name: str
    access_token: str
    refresh_token: str


class UserInfo(BaseModel):
    user_id: str
    email: str
    name: str
    profile: dict | None = None


def _require_db_func(name: str):
    fn = getattr(db_module, name, None)
    if not callable(fn):
        raise HTTPException(
            status_code=503,
            detail=f"Missing DB dependency '{name}'. Discuss with Magzhan team first.",
        )
    return fn


@router.post(
    "/register",
    status_code=201,
    response_model=AuthResponse,
    responses={409: {"description": "Email already exists"}},
)
def register(body: RegisterRequest):
    get_user_by_email = _require_db_func("get_user_by_email")
    create_user = _require_db_func("create_user")

    existing = get_user_by_email(body.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")

    user_id = str(uuid.uuid4())
    password_hash = hash_password(body.password)
    create_user(user_id=user_id, email=body.email, password_hash=password_hash, name=body.name)

    if body.profile is not None:
        update_profile_by_user = _require_db_func("update_profile_by_user")
        fields = body.profile.model_dump(exclude_none=True)
        # Auto-detect OKED from activity description
        activity = fields.get("activity_type")
        if activity:
            oked = detect_oked(activity)
            fields["oked_code"] = oked["oked"]
            fields["oked_name"] = oked["oked_name"]
            fields["oked_banned"] = 1 if oked["banned"] else 0
        update_profile_by_user(user_id=user_id, fields=fields)

    return {
        "user_id": user_id,
        "email": body.email,
        "name": body.name,
        "access_token": create_access_token(user_id),
        "refresh_token": create_refresh_token(user_id),
    }


@router.post(
    "/login",
    response_model=AuthResponse,
    responses={401: {"description": "Wrong credentials"}},
)
def login(body: LoginRequest):
    get_user_by_email = _require_db_func("get_user_by_email")

    user = get_user_by_email(body.email)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Wrong credentials")

    user_id = user["id"]
    return {
        "user_id": user_id,
        "email": user["email"],
        "name": user["name"],
        "access_token": create_access_token(user_id),
        "refresh_token": create_refresh_token(user_id),
    }


@router.post(
    "/refresh",
    response_model=AuthResponse,
    responses={401: {"description": "Invalid refresh token"}},
)
def refresh(body: RefreshRequest):
    get_user_by_id = _require_db_func("get_user_by_id")

    try:
        payload = decode_token(body.refresh_token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid refresh token") from exc

    if payload.get("type") != "refresh" or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    user_id = user["id"]
    return {
        "user_id": user_id,
        "email": user["email"],
        "name": user["name"],
        "access_token": create_access_token(user_id),
        "refresh_token": create_refresh_token(user_id),
    }


@router.get("/me", response_model=UserInfo)
def me(current_user: dict = Depends(get_current_user)):
    get_or_create_profile_by_user = _require_db_func("get_or_create_profile_by_user")
    profile = get_or_create_profile_by_user(current_user["id"])

    return {
        "user_id": current_user["id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "profile": profile,
    }
