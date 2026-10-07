from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Any
import pandas as pd
import numpy as np
from backend.app.core.session_store import session_store
from backend.app.core.calculation_engine import CalculationEngine

router = APIRouter(prefix="/compare", tags=["Compare"])

class CompareRequest(BaseModel):
    dimension: str
    entity1: str
    entity2: str
    metrics: Optional[List[str]] = None

@router.get("/{session_id}/options")
async def get_comparison_options(session_id: str):
    session = session_store.get_session(session_id)
    if not session or session.df is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    df = session.df
    profile = session.profile_cache
    cat_cols = profile.get("categorical_columns", [])
    dt_cols = profile.get("datetime_columns", [])
    num_cols = profile.get("numeric_columns", [])

    options = {}
    for col in cat_cols:
        vals = [str(v) for v in df[col].dropna().unique()[:40]]
        if len(vals) >= 2:
            options[col] = vals

    # Add temporal comparison options (Year vs Year, Month vs Month) if date column exists
    if dt_cols:
        dcol = dt_cols[0]
        try:
            years = sorted([str(y) for y in df[dcol].dt.year.dropna().unique()])
            if len(years) >= 2:
                options["Year (Temporal)"] = years
        except Exception:
            pass

    return {
        "dimensions": list(options.keys()),
        "values_by_dimension": options,
        "available_metrics": num_cols
    }

@router.post("/{session_id}/execute")
async def execute_comparison(session_id: str, req: CompareRequest):
    session = session_store.get_session(session_id)
    if not session or session.df is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    df = session.df.copy()

    # Handle temporal comparison
    actual_dim = req.dimension
    if req.dimension == "Year (Temporal)":
        dt_cols = session.profile_cache.get("datetime_columns", [])
        if dt_cols:
            df["Year (Temporal)"] = df[dt_cols[0]].dt.year.astype(str)
            actual_dim = "Year (Temporal)"

    res = CalculationEngine.compare_groups(
        df,
        dimension=actual_dim,
        val1=req.entity1,
        val2=req.entity2,
        metrics=req.metrics
    )

    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])

    # Prepare chart format for Recharts
    chart_data = []
    comparisons = res.get("comparisons", [])
    for c in comparisons:
        chart_data.append({
            "metric": c["metric"],
            req.entity1: c["val1_sum"],
            req.entity2: c["val2_sum"]
        })

    # Generate analytical conclusion
    leader_counts = {}
    for c in comparisons:
        l = c["leader"]
        leader_counts[l] = leader_counts.get(l, 0) + 1

    overall_winner = max(leader_counts, key=leader_counts.get) if leader_counts else "Tied"
    conclusion = (
        f"In a direct benchmark of '{req.entity1}' vs '{req.entity2}' across {len(comparisons)} metrics, "
        f"'{overall_winner}' emerged as the stronger performer leading in {leader_counts.get(overall_winner, 0)} of {len(comparisons)} indicators. "
    )
    if comparisons:
        c0 = comparisons[0]
        sym = "+" if c0["pct_change_sum"] > 0 else ""
        conclusion += f"In primary metric '{c0['metric']}', '{req.entity2}' recorded {c0['val2_sum']:,} vs '{req.entity1}' {c0['val1_sum']:,} ({sym}{c0['pct_change_sum']}% variance)."

    return {
        "dimension": req.dimension,
        "entity1": req.entity1,
        "entity2": req.entity2,
        "rows_entity1": res["rows_entity1"],
        "rows_entity2": res["rows_entity2"],
        "comparisons": comparisons,
        "chart_data": chart_data,
        "overall_winner": overall_winner,
        "conclusion": conclusion
    }
