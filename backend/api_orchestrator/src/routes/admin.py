"""Admin monitoring routes."""

from fastapi import APIRouter, Depends, HTTPException, Query

from db import database as db_module
from src.auth.admin import get_admin_user

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


@router.get("/check")
def check_admin(_user: dict = Depends(get_admin_user)):
    return {"is_admin": True}


@router.get("/stats")
def get_stats(_user: dict = Depends(get_admin_user)):
    return db_module.admin_get_stats()


@router.get("/users")
def list_users(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    _user: dict = Depends(get_admin_user),
):
    return {"users": db_module.admin_list_users(limit, offset)}


@router.get("/conversations")
def list_conversations(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _user: dict = Depends(get_admin_user),
):
    return {"conversations": db_module.admin_list_conversations(limit, offset)}


@router.get("/conversations/{session_id}")
def get_conversation(
    session_id: str,
    _user: dict = Depends(get_admin_user),
):
    data = db_module.admin_get_conversation(session_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return data


@router.get("/activity")
def get_activity(
    limit: int = Query(50, ge=1, le=200),
    _user: dict = Depends(get_admin_user),
):
    return {"events": db_module.admin_get_activity(limit)}


@router.get("/errors")
def get_errors(
    limit: int = Query(50, ge=1, le=200),
    _user: dict = Depends(get_admin_user),
):
    return {"errors": db_module.admin_get_error_logs(limit)}
