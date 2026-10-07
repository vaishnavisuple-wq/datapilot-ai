from fastapi import APIRouter, HTTPException
from backend.app.core.session_store import session_store
from backend.app.core.anomaly_engine import AnomalyEngine

router = APIRouter(prefix="/anomalies", tags=["Anomalies"])

@router.get("/{session_id}")
async def get_anomalies(session_id: str):
    session = session_store.get_session(session_id)
    if not session or session.df is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    anomalies_data = AnomalyEngine.detect_anomalies(session.df)
    return anomalies_data
