from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

class BusinessIntelligenceEngine:
    """Generates automated executive summaries, risk & opportunity discovery, and actionable recommendations."""

    @staticmethod
    def generate_executive_intelligence(
        df: pd.DataFrame,
        profile: Dict[str, Any],
        trends: Dict[str, Any],
        anomalies: Dict[str, Any],
        forecast: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        num_cols = profile.get("numeric_columns", [])
        cat_cols = profile.get("categorical_columns", [])
        primary_metric = profile.get("primary_metric")
        primary_dim = profile.get("primary_dimension")
        domain = profile.get("inferred_domain", "General Business Dataset")

        # 1. Executive Key Findings
        findings: List[Dict[str, Any]] = []
        risks: List[Dict[str, Any]] = []
        opportunities: List[Dict[str, Any]] = []
        recommendations: List[Dict[str, Any]] = []

        total_rows = profile.get("total_rows", 0)
        data_health = profile.get("data_health_score", 100)

        # Basic summary finding
        findings.append({
            "title": f"Dataset Scope & Baseline Profile",
            "evidence": f"Analyzed {total_rows:,} records across {profile.get('total_columns')} attributes in the {domain} domain.",
            "impact": f"Data integrity score is rated at {data_health}% with {profile.get('duplicate_rows_count', 0)} duplicates."
        })

        # Dimension Performance Finding
        if primary_dim and primary_metric and primary_dim in df.columns and primary_metric in df.columns:
            grp = df.groupby(primary_dim, observed=False)[primary_metric].agg(["sum", "mean", "count"]).sort_values(by="sum", ascending=False)
            if len(grp) > 1:
                top_name = str(grp.index[0])
                top_val = float(grp.iloc[0]["sum"])
                bottom_name = str(grp.index[-1])
                bottom_val = float(grp.iloc[-1]["sum"])
                total_val = float(df[primary_metric].sum())
                top_share = round((top_val / max(1e-5, total_val)) * 100, 1)

                findings.append({
                    "title": f"Concentration of Performance in '{primary_dim}'",
                    "evidence": f"Top category '{top_name}' generated {round(top_val, 2):,} ({top_share}% of total {primary_metric}), while '{bottom_name}' generated {round(bottom_val, 2):,}.",
                    "impact": f"High performance concentration indicates dependency on top segment."
                })

                if top_share > 45:
                    risks.append({
                        "category": "Concentration Risk",
                        "severity": "Medium",
                        "title": f"High reliance on {top_name}",
                        "description": f"Over {top_share}% of total {primary_metric} originates from '{top_name}'. Vulnerable to single-segment market shocks."
                    })
                
                opportunities.append({
                    "category": "Segment Optimization",
                    "title": f"Replicate Best Practices from {top_name}",
                    "description": f"Apply playbook, pricing, or operational methods of {top_name} to raise lower quartile segments like {bottom_name}."
                })

        # Profit / Margin / Expense Check if available
        profit_col = next((c for c in num_cols if "profit" in c.lower() or "margin" in c.lower()), None)
        sales_col = next((c for c in num_cols if "sales" in c.lower() or "revenue" in c.lower() or "mrr" in c.lower()), None)
        
        if profit_col and sales_col and primary_dim and primary_dim in df.columns:
            p_grp = df.groupby(primary_dim, observed=False)[[sales_col, profit_col]].sum()
            p_grp["margin_pct"] = (p_grp[profit_col] / p_grp[sales_col].replace(0, np.nan)) * 100
            soft_margin = p_grp.sort_values(by="margin_pct").iloc[0]
            best_margin = p_grp.sort_values(by="margin_pct", ascending=False).iloc[0]

            findings.append({
                "title": f"Margin Efficiency Disparity",
                "evidence": f"'{best_margin.name}' boasts highest margin at {round(best_margin['margin_pct'], 1)}%, whereas '{soft_margin.name}' operates at {round(soft_margin['margin_pct'], 1)}%.",
                "impact": f"Volume alone does not dictate profitability."
            })

            if soft_margin["margin_pct"] < 15:
                risks.append({
                    "category": "Margin Compression",
                    "severity": "High",
                    "title": f"Thin margins in {soft_margin.name}",
                    "description": f"Unit economics in {soft_margin.name} ({round(soft_margin['margin_pct'], 1)}% margin) risk unprofitability under discounting or inflation."
                })

                recommendations.append({
                    "area": "Pricing & Discount Strategy",
                    "finding": f"'{soft_margin.name}' exhibits compressed margins of {round(soft_margin['margin_pct'], 1)}%.",
                    "action": f"Audit discount thresholds and cost structure for {soft_margin.name}; tighten discount ceilings by 5-8%.",
                    "expected_impact": "Direct improvement of gross operating margin without sacrificing core volume."
                })

        # Anomaly Risks
        critical_anomalies = [a for a in anomalies.get("anomalies", []) if a.get("severity") == "Critical"]
        if critical_anomalies:
            risks.append({
                "category": "Data & Operational Volatility",
                "severity": "High",
                "title": f"{len(critical_anomalies)} Critical Operational Outliers Flagged",
                "description": f"Extreme deviations detected in {critical_anomalies[0].get('primary_feature')} (up to {critical_anomalies[0].get('z_score')}σ). Investigate flagged records for system errors or unusual transactions."
            })

        # Trend & Forecast Opportunities
        if forecast and forecast.get("is_eligible"):
            metrics = forecast.get("metrics", {})
            growth_rate = metrics.get("projected_growth_rate_pct", 0)
            trend_dir = metrics.get("trend_direction", "")

            if growth_rate > 3:
                opportunities.append({
                    "category": "Growth Capitalization",
                    "title": f"Favorable Horizon Projection (+{growth_rate}%)",
                    "description": f"Forecasting model anticipates continuous expansion into the next {forecast.get('horizon_periods')} periods. Ready inventory/infrastructure."
                })
                recommendations.append({
                    "area": "Operational Capacity Planning",
                    "finding": f"Time-series model forecasts +{growth_rate}% upward trajectory.",
                    "action": f"Proactively increase replenishment orders and allocate operational staffing 15% ahead of forecasted peak.",
                    "expected_impact": "Avoid stockouts/bottlenecks and capture maximum upside during expansion cycles."
                })
            elif growth_rate < -3:
                risks.append({
                    "category": "Demand Softening",
                    "severity": "High",
                    "title": f"Projected Contraction ({growth_rate}%)",
                    "description": f"Forecast indicates potential dip over upcoming periods. Pre-emptive customer retention or marketing push needed."
                })
                recommendations.append({
                    "area": "Demand Stimulation",
                    "finding": f"Projected volume contraction of {growth_rate}%.",
                    "action": "Deploy targeted promotional campaigns, re-engage dormant segments, and review competitor pricing.",
                    "expected_impact": "Mitigate top-line revenue decline and stabilize customer order frequency."
                })

        # Generic High-Value Recommendation if list is short
        if len(recommendations) < 3:
            recommendations.append({
                "area": "Data Governance & Real-Time Monitoring",
                "finding": f"Dataset contains {profile.get('total_outliers', 0)} total statistical outliers and {profile.get('duplicate_rows_count', 0)} duplicates.",
                "action": "Implement automated validation rules at data entry and establish automated alerts on 3-sigma deviations.",
                "expected_impact": "Higher reporting fidelity and immediate notification when metrics breach expected thresholds."
            })

        # Final C-Suite Conclusion
        conclusion = (
            f"Overall, the {domain} dataset demonstrates a solid operational foundation with an overall health score of {data_health}%. "
            f"The primary driver is '{primary_metric or 'performance metrics'}', which is heavily influenced by segments such as '{primary_dim or 'key dimensions'}'. "
            f"By addressing the highlighted {len(risks)} operational risks and acting upon the {len(recommendations)} strategic recommendations, "
            f"leadership can protect operating margins, mitigate single-segment exposure, and capitalize on projected demand growth."
        )

        return {
            "executive_summary_title": f"Strategic Analysis: {domain}",
            "health_score": data_health,
            "key_findings": findings,
            "major_risks": risks,
            "strategic_opportunities": opportunities,
            "actionable_recommendations": recommendations,
            "final_conclusion": conclusion
        }
