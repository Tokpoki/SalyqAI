"""Internal orchestration routes for RAG and rules."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.config import get_settings

router = APIRouter(prefix="/api/v1")
settings = get_settings()


class RetrieveRequest(BaseModel):
    query: str
    top_k: int = 5
    knowledge_version: str = settings.knowledge_version


class RulesEvaluateRequest(BaseModel):
    profile: dict


@router.post("/rag/retrieve")
def rag_retrieve(body: RetrieveRequest):
    raise HTTPException(
        status_code=501,
        detail="RAG retriever is not connected yet. Waiting for data_rag_rules integration.",
    )


@router.post("/rules/evaluate")
def rules_evaluate(body: RulesEvaluateRequest):
    raise HTTPException(
        status_code=501,
        detail="Rules evaluator is not connected yet. Waiting for data_rag_rules integration.",
    )
