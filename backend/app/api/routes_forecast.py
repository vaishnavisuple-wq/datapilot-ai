from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from backend.app.core.session_store import session_store
from backend.app.core.forecasting_engine import ForecastingEngine

router = APIRouter(prefix="/forecast", tags=["Forecast"])

@router.get("/{session_id}")
async def get_forecast(
    session_id: str,
    metric: Optional[str] = Query(None),
    date_col: Optional[str] = Query(None),
    horizon: int = Query(6, ge=1, le=24)
):
    session = session_store.get_session(session_id)
    if not session or session.df is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    forecast_data = ForecastingEngine.forecast_metric(
        session.df,
        date_col=date_col,
        metric_col=metric,
        horizon_periods=horizon
    )
    return forecast_data
