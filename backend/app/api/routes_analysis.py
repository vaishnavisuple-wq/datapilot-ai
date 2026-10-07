from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from backend.app.core.session_store import session_store
from backend.app.core.calculation_engine import CalculationEngine

router = APIRouter(prefix="/analysis", tags=["Analysis"])

class AggregateRequest(BaseModel):
    dimension: str
    metric: str
    aggregation: str = "sum"
    top_n: int = 10
    sort_desc: bool = True

class SafeQueryRequest(BaseModel):
    code: str

@router.get("/{session_id}/profile")
async def get_profile(session_id: str):
    session = session_store.get_session(session_id)
    if not session or session.df is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    return session.profile_cache

@router.post("/{session_id}/aggregate")
async def aggregate_data(session_id: str, req: AggregateRequest):
    session = session_store.get_session(session_id)
    if not session or session.df is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    res = CalculationEngine.aggregate_by(
        session.df,
        dimension=req.dimension,
        metric=req.metric,
        agg=req.aggregation,
        top_n=req.top_n,
        sort_desc=req.sort_desc
    )
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@router.post("/{session_id}/safe-query")
async def run_safe_query(session_id: str, req: SafeQueryRequest):
    session = session_store.get_session(session_id)
    if not session or session.df is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    result = CalculationEngine.execute_safe_query(session.df, req.code)
    return result
