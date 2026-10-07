from fastapi import APIRouter, HTTPException
from backend.app.core.session_store import session_store
from backend.app.core.trend_engine import TrendEngine

router = APIRouter(prefix="/trends", tags=["Trends"])

@router.get("/{session_id}")
async def get_trends(session_id: str):
    session = session_store.get_session(session_id)
    if not session or session.df is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    trends_data = TrendEngine.analyze_trends(session.df)
    return trends_data
