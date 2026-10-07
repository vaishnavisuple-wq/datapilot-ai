import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional

class TrendEngine:
    """Detects historical trends, period growth, seasonality, and category momentum."""

    @staticmethod
    def analyze_trends(df: pd.DataFrame) -> Dict[str, Any]:
        dt_cols = [c for c in df.columns if pd.api.types.is_datetime64_any_dtype(df[c])]
        num_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
        cat_cols = [c for c in df.columns if not pd.api.types.is_numeric_dtype(df[c]) and not pd.api.types.is_datetime64_any_dtype(df[c]) and df[c].nunique() < 25]

        if not num_cols:
            return {"has_temporal_trends": False, "summary": "No numerical metrics found for trend analysis."}

        primary_metric = num_cols[0]
        # Prefer sales/revenue/profit
        for m in num_cols:
            if any(k in m.lower() for k in ["sales", "revenue", "mrr", "profit", "amount"]):
                primary_metric = m
                break

        findings: List[Dict[str, Any]] = []
        periodic_chart = []
        seasonality_insights = []

        if dt_cols:
            date_col = dt_cols[0]
            clean_df = df.dropna(subset=[date_col, primary_metric]).sort_values(by=date_col)
            
            if len(clean_df) >= 4:
                span_days = (clean_df[date_col].max() - clean_df[date_col].min()).days
                resample_freq = "MS" if span_days > 120 else ("W-MON" if span_days > 30 else "D")
                
                grouped = clean_df.set_index(date_col).resample(resample_freq)[primary_metric].sum()
                
                # Period-over-Period growth
                pct_changes = grouped.pct_change() * 100
                
                # Chart points
                for d, val in grouped.items():
                    pct = pct_changes.get(d)
                    periodic_chart.append({
                        "period": d.strftime("%Y-%m" if resample_freq == "MS" else "%Y-%m-%d"),
                        "metric_value": round(float(val), 2),
                        "growth_rate_pct": round(float(pct), 2) if pd.notna(pct) else 0.0
                    })

                # Peak and Trough periods
                if len(grouped) > 1:
                    max_period = grouped.idxmax()
                    min_period = grouped.idxmin()
                    max_val = float(grouped.max())
                    min_val = float(grouped.min())

                    findings.append({
                        "type": "Peak Performance Period",
                        "title": f"Highest {primary_metric} recorded in {max_period.strftime('%B %Y' if resample_freq == 'MS' else '%Y-%m-%d')}",
                        "metric": primary_metric,
                        "value": round(max_val, 2),
                        "description": f"Reached all-time high of {round(max_val, 2)}, which is {round(max_val / max(1e-5, float(grouped.mean())), 1)}x above the period average."
                    })

                    findings.append({
                        "type": "Trough Performance Period",
                        "title": f"Lowest {primary_metric} recorded in {min_period.strftime('%B %Y' if resample_freq == 'MS' else '%Y-%m-%d')}",
                        "metric": primary_metric,
                        "value": round(min_val, 2),
                        "description": f"Dipped to {round(min_val, 2)} ({round(((min_val - float(grouped.mean())) / max(1e-5, float(grouped.mean()))) * 100, 1)}% vs average)."
                    })

                # Overall Long-Term Trend
                if len(grouped) >= 3:
                    first_half = grouped.iloc[:len(grouped)//2].mean()
                    second_half = grouped.iloc[len(grouped)//2:].mean()
                    long_term_growth = round(((second_half - first_half) / max(1e-5, abs(first_half))) * 100, 2)
                    direction = "Positive Expansion" if long_term_growth > 5 else ("Contraction" if long_term_growth < -5 else "Neutral/Flat")

                    findings.append({
                        "type": "Macro Trend Direction",
                        "title": f"Dataset exhibits {direction} ({long_term_growth}% overall growth)",
                        "metric": primary_metric,
                        "value": long_term_growth,
                        "description": f"Comparing the earlier timeline half vs recent half indicates a {long_term_growth}% shift in aggregate volume."
                    })

                # Check Monthly / Seasonal Pattern
                clean_df["_month"] = clean_df[date_col].dt.month_name()
                month_grp = clean_df.groupby("_month", observed=False)[primary_metric].mean()
                if len(month_grp) > 3:
                    best_month = month_grp.idxmax()
                    worst_month = month_grp.idxmin()
                    seasonality_insights.append(f"Strongest calendar month across records is {best_month} (avg {round(float(month_grp.max()), 1)}).")
                    seasonality_insights.append(f"Softest calendar month is {worst_month} (avg {round(float(month_grp.min()), 1)}).")

        # Category momentum if categories exist
        category_momentum = []
        if cat_cols and dt_cols and len(clean_df) >= 10:
            cat_col = cat_cols[0]
            try:
                # Compare first half vs second half volume per category
                mid_date = clean_df[date_col].median()
                h1 = clean_df[clean_df[date_col] <= mid_date].groupby(cat_col)[primary_metric].sum()
                h2 = clean_df[clean_df[date_col] > mid_date].groupby(cat_col)[primary_metric].sum()
                
                common = h1.index.intersection(h2.index)
                for c in common[:6]:
                    v1 = float(h1[c])
                    v2 = float(h2[c])
                    pct = round(((v2 - v1) / max(1e-5, abs(v1))) * 100, 1)
                    category_momentum.append({
                        "category": str(c),
                        "h1_total": round(v1, 2),
                        "h2_total": round(v2, 2),
                        "growth_pct": pct,
                        "status": "Accelerating" if pct > 10 else ("Declining" if pct < -10 else "Steady")
                    })
                category_momentum.sort(key=lambda x: x["growth_pct"], reverse=True)
            except Exception:
                pass

        return {
            "has_temporal_trends": bool(dt_cols),
            "primary_metric": primary_metric,
            "periodic_chart": periodic_chart[-24:],
            "findings": findings,
            "seasonality_insights": seasonality_insights,
            "category_momentum": category_momentum
        }
