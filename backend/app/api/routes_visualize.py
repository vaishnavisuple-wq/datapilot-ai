from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import pandas as pd
import numpy as np
from backend.app.core.session_store import session_store
from backend.app.core.calculation_engine import CalculationEngine

router = APIRouter(prefix="/visualize", tags=["Visualize"])

class CustomChartRequest(BaseModel):
    chart_type: str  # "bar", "line", "pie", "scatter", "histogram"
    x_col: str
    y_col: Optional[str] = None
    agg_func: str = "sum"
    top_n: int = 10

@router.get("/{session_id}/auto-charts")
async def get_auto_charts(session_id: str):
    session = session_store.get_session(session_id)
    if not session or session.df is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    df = session.df
    profile = session.profile_cache
    num_cols = profile.get("numeric_columns", [])
    cat_cols = profile.get("categorical_columns", [])
    dt_cols = profile.get("datetime_columns", [])
    primary_metric = profile.get("primary_metric") or (num_cols[0] if num_cols else None)
    primary_dim = profile.get("primary_dimension") or (cat_cols[0] if cat_cols else None)

    charts: List[Dict[str, Any]] = []

    # 1. Primary Dimension Bar Chart
    if primary_dim and primary_metric and primary_dim in df.columns and primary_metric in df.columns:
        agg_res = CalculationEngine.aggregate_by(df, primary_dim, primary_metric, agg="sum", top_n=8)
        charts.append({
            "id": "primary_bar",
            "title": f"{primary_metric} by {primary_dim}",
            "type": "bar",
            "x_axis": primary_dim,
            "y_axis": primary_metric,
            "data": agg_res.get("data", []),
            "description": f"Distribution of total {primary_metric} across top {primary_dim} segments."
        })

    # 2. Donut / Pie Share Chart
    if primary_dim and primary_metric and primary_dim in df.columns and primary_metric in df.columns:
        agg_res = CalculationEngine.aggregate_by(df, primary_dim, primary_metric, agg="sum", top_n=5)
        charts.append({
            "id": "primary_donut",
            "title": f"Share of {primary_metric} by {primary_dim}",
            "type": "pie",
            "x_axis": "category",
            "y_axis": "value",
            "data": agg_res.get("data", []),
            "description": f"Proportional contribution of top {primary_dim} categories."
        })

    # 3. Time Series Line Chart (if date exists)
    if dt_cols and primary_metric:
        date_col = dt_cols[0]
        try:
            clean_ts = df.dropna(subset=[date_col, primary_metric]).sort_values(by=date_col)
            span_days = (clean_ts[date_col].max() - clean_ts[date_col].min()).days
            freq = "MS" if span_days > 120 else ("W-MON" if span_days > 30 else "D")
            resampled = clean_ts.set_index(date_col).resample(freq)[primary_metric].sum()
            
            line_data = [
                {"date": d.strftime("%Y-%m" if freq == "MS" else "%Y-%m-%d"), "value": round(float(v), 2)}
                for d, v in resampled.tail(30).items()
            ]
            charts.append({
                "id": "trend_line",
                "title": f"{primary_metric} Over Time",
                "type": "line",
                "x_axis": "date",
                "y_axis": "value",
                "data": line_data,
                "description": f"Historical trajectory of {primary_metric} across regular periods."
            })
        except Exception:
            pass

    # 4. Scatter Plot (Correlation exploration between two numerical columns)
    if len(num_cols) >= 2:
        c1, c2 = num_cols[0], num_cols[1]
        sample_df = df.dropna(subset=[c1, c2]).head(100)
        scatter_data = [
            {"x": round(float(r[c1]), 2), "y": round(float(r[c2]), 2), "label": str(r[primary_dim]) if primary_dim and primary_dim in r else f"#{i}"}
            for i, r in sample_df.iterrows()
        ]
        charts.append({
            "id": "scatter_corr",
            "title": f"{c1} vs {c2} Correlation",
            "type": "scatter",
            "x_axis": c1,
            "y_axis": c2,
            "data": scatter_data,
            "description": f"Bivariate relationship exploring how {c1} correlates with {c2}."
        })

    # 5. Histogram / Value Distribution of Primary Metric
    if primary_metric and primary_metric in df.columns:
        s = df[primary_metric].dropna()
        if len(s) > 5:
            counts, bin_edges = np.histogram(s, bins=8)
            hist_data = []
            for i in range(len(counts)):
                range_label = f"{round(bin_edges[i], 1)} - {round(bin_edges[i+1], 1)}"
                hist_data.append({"bucket": range_label, "count": int(counts[i])})
            charts.append({
                "id": "dist_hist",
                "title": f"{primary_metric} Distribution",
                "type": "histogram",
                "x_axis": "bucket",
                "y_axis": "count",
                "data": hist_data,
                "description": f"Frequency distribution showing data spread and concentrations for {primary_metric}."
            })

    # 6. Secondary Dimension Bar Chart (e.g. Region or Segment)
    secondary_dims = [c for c in cat_cols if c != primary_dim]
    if secondary_dims and primary_metric:
        sec_dim = secondary_dims[0]
        agg_sec = CalculationEngine.aggregate_by(df, sec_dim, primary_metric, agg="sum", top_n=6)
        charts.append({
            "id": "secondary_bar",
            "title": f"{primary_metric} by {sec_dim}",
            "type": "bar",
            "x_axis": sec_dim,
            "y_axis": primary_metric,
            "data": agg_sec.get("data", []),
            "description": f"Breakdown across secondary dimension '{sec_dim}'."
        })

    return {
        "total_charts": len(charts),
        "charts": charts
    }

@router.post("/{session_id}/custom-chart")
async def create_custom_chart(session_id: str, req: CustomChartRequest):
    session = session_store.get_session(session_id)
    if not session or session.df is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    df = session.df
    if req.x_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{req.x_col}' does not exist.")

    if req.chart_type in ["bar", "pie", "donut"]:
        if not req.y_col or req.y_col not in df.columns:
            # Frequency count of x_col
            counts = df[req.x_col].value_counts().head(req.top_n)
            data = [{"category": str(k), "value": int(v)} for k, v in counts.items()]
            return {
                "title": f"Count by {req.x_col}",
                "type": req.chart_type,
                "x_axis": req.x_col,
                "y_axis": "Count",
                "data": data
            }
        else:
            agg_res = CalculationEngine.aggregate_by(df, req.x_col, req.y_col, agg=req.agg_func, top_n=req.top_n)
            return {
                "title": f"{req.y_col} by {req.x_col}",
                "type": req.chart_type,
                "x_axis": req.x_col,
                "y_axis": req.y_col,
                "data": agg_res.get("data", [])
            }

    elif req.chart_type == "scatter":
        if not req.y_col or req.y_col not in df.columns:
            raise HTTPException(status_code=400, detail="Scatter plot requires numerical y_col")
        sample_df = df.dropna(subset=[req.x_col, req.y_col]).head(100)
        scatter_data = [
            {"x": round(float(r[req.x_col]), 2), "y": round(float(r[req.y_col]), 2)}
            for _, r in sample_df.iterrows()
        ]
        return {
            "title": f"{req.x_col} vs {req.y_col}",
            "type": "scatter",
            "x_axis": req.x_col,
            "y_axis": req.y_col,
            "data": scatter_data
        }

    raise HTTPException(status_code=400, detail=f"Unsupported custom chart type '{req.chart_type}'")
