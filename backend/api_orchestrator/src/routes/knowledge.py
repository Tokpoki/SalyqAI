"""Knowledge base metadata routes."""

from fastapi import APIRouter

from src.config import get_settings

router = APIRouter(prefix="/api/v1")
settings = get_settings()


@router.get("/knowledge/versions")
def list_knowledge_versions():
    return {"versions": [settings.knowledge_version]}
