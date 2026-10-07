from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import pandas as pd
import numpy as np
from backend.app.core.session_store import session_store
from backend.app.core.calculation_engine import CalculationEngine
from backend.app.core.data_profiler import DataProfiler

router = APIRouter(prefix="/visualize", tags=["Visualize"])

class CustomChartRequest(BaseModel):
    chart_type: str  # "bar", "line", "area", "pie", "scatter", "histogram"
    x_col: str
    y_col: Optional[str] = None
    agg_func: str = "auto"  # "auto", "sum", "mean", "count", "min", "max"
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

    # Check metric classification for mathematical soundness
    metric_class = DataProfiler.classify_metric(primary_metric, df[primary_metric] if primary_metric and primary_metric in df.columns else None) if primary_metric else {"is_additive": True, "default_agg": "sum"}
    is_rate = not metric_class["is_additive"]

    # 1. Primary Dimension Bar Chart (Average for rates, Sum for volume)
    if primary_dim and primary_metric and primary_dim in df.columns and primary_metric in df.columns:
        chosen_agg = "mean" if is_rate else "sum"
        agg_res = CalculationEngine.aggregate_by(df, primary_dim, primary_metric, agg=chosen_agg, top_n=8)
        prefix = "Average" if is_rate else "Total"
        charts.append({
            "id": "primary_bar",
            "title": f"{prefix} {primary_metric} by {primary_dim}",
            "type": "bar",
            "x_axis": primary_dim,
            "y_axis": primary_metric,
            "aggregation": chosen_agg,
            "data": agg_res.get("data", []),
            "description": f"{prefix} {primary_metric} grouped across top {primary_dim} segments."
        })

    # 2. Donut / Pie Share Chart (ONLY for additive volume metrics or counts; never for rates/percentages)
    if primary_dim and primary_dim in df.columns:
        if not is_rate and primary_metric and primary_metric in df.columns:
            agg_res = CalculationEngine.aggregate_by(df, primary_dim, primary_metric, agg="sum", top_n=5)
            charts.append({
                "id": "primary_donut",
                "title": f"Share of Total {primary_metric} by {primary_dim}",
                "type": "pie",
                "x_axis": "category",
                "y_axis": "value",
                "data": agg_res.get("data", []),
                "description": f"Proportional percentage contribution of top {primary_dim} categories."
            })
        else:
            # For rates, donut shows record distribution
            counts = df[primary_dim].value_counts().head(5)
            data_counts = [{"category": str(k), "value": int(v)} for k, v in counts.items()]
            charts.append({
                "id": "primary_donut",
                "title": f"Distribution of Records by {primary_dim}",
                "type": "pie",
                "x_axis": "category",
                "y_axis": "value",
                "data": data_counts,
                "description": f"Record count distribution across top {primary_dim} segments."
            })

    # 3. Time Series Line / Progression Chart (if date exists)
    if dt_cols and primary_metric and primary_metric in df.columns:
        date_col = dt_cols[0]
        try:
            clean_ts = df.dropna(subset=[date_col, primary_metric]).sort_values(by=date_col)
            span_days = (clean_ts[date_col].max() - clean_ts[date_col].min()).days
            freq = "MS" if span_days > 120 else ("W-MON" if span_days > 30 else "D")
            
            # Use mean for rate/level metrics, sum for flow/volume
            if is_rate:
                resampled = clean_ts.set_index(date_col).resample(freq)[primary_metric].mean()
                line_title = f"Average {primary_metric} Over Time"
            else:
                resampled = clean_ts.set_index(date_col).resample(freq)[primary_metric].sum()
                line_title = f"Total {primary_metric} Over Time"

            line_data = [
                {"date": d.strftime("%Y-%m" if freq == "MS" else "%Y-%m-%d"), "value": round(float(v), 2)}
                for d, v in resampled.dropna().tail(30).items()
            ]
            charts.append({
                "id": "trend_line",
                "title": line_title,
                "type": "line",
                "x_axis": "date",
                "y_axis": "value",
                "aggregation": "mean" if is_rate else "sum",
                "data": line_data,
                "description": f"Historical trajectory across {freq} intervals."
            })
        except Exception:
            pass

    # 4. Scatter Plot (Bivariate Correlation Exploration)
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
            "description": f"Bivariate distribution showing how {c1} relates to {c2}."
        })

    # 5. Histogram / Distribution of Primary Metric
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
                "description": f"Frequency buckets showing concentrations and spread for {primary_metric}."
            })

    # 6. Secondary Dimension Bar Chart (e.g. Region or Segment)
    secondary_dims = [c for c in cat_cols if c != primary_dim]
    if secondary_dims and primary_metric:
        sec_dim = secondary_dims[0]
        agg_choice = "mean" if is_rate else "sum"
        agg_sec = CalculationEngine.aggregate_by(df, sec_dim, primary_metric, agg=agg_choice, top_n=6)
        prefix = "Average" if is_rate else "Total"
        charts.append({
            "id": "secondary_bar",
            "title": f"{prefix} {primary_metric} by {sec_dim}",
            "type": "bar",
            "x_axis": sec_dim,
            "y_axis": primary_metric,
            "aggregation": agg_choice,
            "data": agg_sec.get("data", []),
            "description": f"Secondary breakdown comparing {sec_dim} categories."
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

    # Determine aggregation function
    agg_func = req.agg_func
    if agg_func == "auto" or not agg_func:
        if req.y_col and req.y_col in df.columns:
            m_class = DataProfiler.classify_metric(req.y_col, df[req.y_col])
            agg_func = m_class["default_agg"]
        else:
            agg_func = "count"

    # Scatter Chart
    if req.chart_type == "scatter":
        if not req.y_col or req.y_col not in df.columns:
            raise HTTPException(status_code=400, detail="Scatter plot requires numerical y_col")
        sample_df = df.dropna(subset=[req.x_col, req.y_col]).head(120)
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

    # Date-based Line / Area Chart
    if pd.api.types.is_datetime64_any_dtype(df[req.x_col]) and req.chart_type in ["line", "area"]:
        if not req.y_col or req.y_col not in df.columns:
            # Daily count
            grouped = df.groupby(df[req.x_col].dt.strftime("%Y-%m-%d")).size()
            data = [{"date": str(d), "value": int(v)} for d, v in grouped.tail(req.top_n * 3).items()]
            return {
                "title": f"Count Over Time ({req.x_col})",
                "type": req.chart_type,
                "x_axis": req.x_col,
                "y_axis": "Count",
                "data": data
            }
        else:
            clean = df.dropna(subset=[req.x_col, req.y_col]).sort_values(by=req.x_col)
            grouped = clean.groupby(clean[req.x_col].dt.strftime("%Y-%m-%d"))[req.y_col].agg(agg_func)
            data = [{"date": str(d), "value": round(float(v), 2)} for d, v in grouped.tail(req.top_n * 3).items()]
            return {
                "title": f"{agg_func.capitalize()} of {req.y_col} Over Time",
                "type": req.chart_type,
                "x_axis": req.x_col,
                "y_axis": req.y_col,
                "data": data
            }

    # Standard Categorical Charts (Bar, Line, Area, Pie)
    if not req.y_col or req.y_col not in df.columns:
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
        agg_res = CalculationEngine.aggregate_by(df, req.x_col, req.y_col, agg=agg_func, top_n=req.top_n)
        return {
            "title": f"{agg_func.capitalize()} of {req.y_col} by {req.x_col}",
            "type": req.chart_type,
            "x_axis": req.x_col,
            "y_axis": req.y_col,
            "aggregation": agg_func,
            "data": agg_res.get("data", [])
        }
