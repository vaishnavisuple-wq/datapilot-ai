import os
import json
import re
from typing import Dict, Any, List, Optional
import httpx
import pandas as pd
import numpy as np
from backend.app.core.config import settings
from backend.app.core.calculation_engine import CalculationEngine
from backend.app.core.anomaly_engine import AnomalyEngine
from backend.app.core.forecasting_engine import ForecastingEngine
from backend.app.core.trend_engine import TrendEngine

class LLMService:
    """Orchestrates natural language data queries with guaranteed calculation grounding and conversational memory."""

    @staticmethod
    async def process_chat_query(
        query: str,
        df: pd.DataFrame,
        profile: Dict[str, Any],
        chat_history: List[Dict[str, Any]],
        api_key_override: Optional[str] = None,
        provider_override: Optional[str] = None
    ) -> Dict[str, Any]:
        query_clean = query.strip()
        provider = provider_override or settings.DEFAULT_LLM_PROVIDER
        gemini_key = api_key_override or settings.GEMINI_API_KEY
        openai_key = api_key_override or settings.OPENAI_API_KEY

        # Check if user has an active LLM key
        has_llm_key = bool(gemini_key if "gemini" in provider.lower() else openai_key)

        if has_llm_key:
            try:
                if "gemini" in provider.lower() and gemini_key:
                    return await LLMService._query_gemini(query_clean, df, profile, chat_history, gemini_key)
                elif openai_key:
                    return await LLMService._query_openai(query_clean, df, profile, chat_history, openai_key)
            except Exception as e:
                # If LLM API call fails (rate limit, invalid key, network), seamlessly fallback to our smart semantic engine!
                fallback_res = LLMService._semantic_local_query(query_clean, df, profile, chat_history)
                fallback_res["note"] = f"(Note: Switched to deterministic calculation engine: {str(e)})"
                return fallback_res

        # Deterministic Ground-Truth Semantic Engine (runs offline & with zero hallucinations)
        return LLMService._semantic_local_query(query_clean, df, profile, chat_history)

    @staticmethod
    def _semantic_local_query(
        query: str,
        df: pd.DataFrame,
        profile: Dict[str, Any],
        chat_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        q = query.lower()
        num_cols = profile.get("numeric_columns", [])
        cat_cols = profile.get("categorical_columns", [])
        primary_metric = profile.get("primary_metric") or (num_cols[0] if num_cols else "")
        primary_dim = profile.get("primary_dimension") or (cat_cols[0] if cat_cols else "")

        # 1. Best / Top Performing Entities
        if any(w in q for w in ["best", "top", "highest", "leader", "most", "ranking"]):
            target_dim = primary_dim
            for c in cat_cols:
                if c.lower() in q:
                    target_dim = c
                    break
            target_metric = primary_metric
            for m in num_cols:
                if m.lower() in q:
                    target_metric = m
                    break
            
            # Check if profit or margin requested
            if "profit" in q and any("profit" in m.lower() for m in num_cols):
                target_metric = next(m for m in num_cols if "profit" in m.lower())
            elif "sales" in q and any("sales" in m.lower() for m in num_cols):
                target_metric = next(m for m in num_cols if "sales" in m.lower())

            agg_res = CalculationEngine.aggregate_by(df, target_dim, target_metric, "sum", top_n=5)
            if "data" in agg_res and len(agg_res["data"]) > 0:
                top_item = agg_res["data"][0]
                total = df[target_metric].sum()
                code_snippet = f"df.groupby('{target_dim}')['{target_metric}'].sum().sort_values(ascending=False).head(5)"
                
                answer_lines = [
                    f"### Top-Performing Analysis for **{target_dim}** by **{target_metric}**",
                    f"- 🥇 **{top_item['category']}** leads the dataset with **{top_item['value']:,}** ({top_item.get('share_percentage', 0)}% of total {target_metric}).",
                ]
                for i, item in enumerate(agg_res["data"][1:5], start=2):
                    answer_lines.append(f"- #{i} **{item['category']}**: {item['value']:,} ({item.get('share_percentage', 0)}%)")

                answer_lines.append(f"\n**Strategic Insight:** Concentration in `{top_item['category']}` represents a key growth engine. To scale further, evaluate cross-selling opportunities into subsequent tiers.")

                return {
                    "answer": "\n".join(answer_lines),
                    "query_executed": code_snippet,
                    "data_table": agg_res["data"],
                    "chart_spec": {
                        "type": "bar",
                        "title": f"Top {target_dim} by {target_metric}",
                        "xKey": "category",
                        "yKey": "value",
                        "data": agg_res["data"]
                    },
                    "suggested_followups": [
                        f"Why is {top_item['category']} outperforming others?",
                        f"Compare {top_item['category']} with {agg_res['data'][1]['category'] if len(agg_res['data']) > 1 else 'competitors'}",
                        f"Show bottom-performing {target_dim}"
                    ]
                }

        # 2. Comparison Queries (e.g., "compare X and Y", "A vs B")
        compare_match = re.search(r"compare\s+([a-zA-Z0-9\s]+)\s+(?:and|with|to|vs)\s+([a-zA-Z0-9\s]+)", q)
        if compare_match or " vs " in q:
            ent1, ent2 = None, None
            if compare_match:
                ent1 = compare_match.group(1).strip()
                ent2 = compare_match.group(2).strip()
            elif " vs " in q:
                parts = q.split(" vs ")
                ent1 = parts[0].replace("compare", "").strip()
                ent2 = parts[1].strip()

            # Find matching column
            target_dim = primary_dim
            if ent1 and ent2:
                for col in cat_cols:
                    unique_vals = [str(v).lower() for v in df[col].dropna().unique()]
                    matched1 = next((v for v in unique_vals if ent1 in v or v in ent1), None)
                    matched2 = next((v for v in unique_vals if ent2 in v or v in ent2), None)
                    if matched1 and matched2:
                        target_dim = col
                        # get exact case
                        ent1 = next(str(v) for v in df[col].dropna().unique() if str(v).lower() == matched1)
                        ent2 = next(str(v) for v in df[col].dropna().unique() if str(v).lower() == matched2)
                        break

            # If not found directly, take top 2 of primary dimension
            if not ent1 or not ent2:
                top_items = df[primary_dim].value_counts().index[:2]
                if len(top_items) >= 2:
                    ent1, ent2 = str(top_items[0]), str(top_items[1])
                    target_dim = primary_dim

            comp_res = CalculationEngine.compare_groups(df, target_dim, ent1, ent2)
            if "comparisons" in comp_res:
                lines = [
                    f"### Head-to-Head Comparison: **{ent1}** vs **{ent2}** (`{target_dim}`)",
                    f"Sample size: **{ent1}** ({comp_res['rows_entity1']} rows) vs **{ent2}** ({comp_res['rows_entity2']} rows).\n",
                ]
                chart_data = []
                for c in comp_res["comparisons"][:4]:
                    diff_sym = "+" if c["diff_sum"] > 0 else ""
                    lines.append(f"- **{c['metric']}**: `{ent1}` = **{c['val1_sum']:,}** vs `{ent2}` = **{c['val2_sum']:,}** ({diff_sym}{c['pct_change_sum']}% change). Winner: **{c['leader']}**")
                    chart_data.append({
                        "metric": c["metric"],
                        ent1: c["val1_sum"],
                        ent2: c["val2_sum"]
                    })

                lines.append(f"\n**Strategic Conclusion:** `{comp_res['comparisons'][0]['leader']}` holds overall dominance in `{comp_res['comparisons'][0]['metric']}`.")

                return {
                    "answer": "\n".join(lines),
                    "query_executed": f"df[df['{target_dim}'].isin(['{ent1}', '{ent2}'])].groupby('{target_dim}').agg('sum')",
                    "data_table": comp_res["comparisons"],
                    "chart_spec": {
                        "type": "comparison_bar",
                        "title": f"Comparison: {ent1} vs {ent2}",
                        "xKey": "metric",
                        "keys": [ent1, ent2],
                        "data": chart_data
                    },
                    "suggested_followups": [
                        f"Why did {ent1} achieve higher volume?",
                        f"Forecast upcoming performance for {ent1}",
                        "Compare across different regions"
                    ]
                }

        # 3. Why did decline / Problems / Risks
        if any(w in q for w in ["why", "decline", "drop", "problem", "risk", "worst", "loss", "decrease"]):
            anomalies = AnomalyEngine.detect_anomalies(df)
            trends = TrendEngine.analyze_trends(df)

            lines = [
                "### Root-Cause & Risk Diagnostics",
                "Based on statistical inspection across the dataset, here are the primary drivers of performance dips and vulnerabilities:\n"
            ]

            # Find worst performing segment
            if primary_dim and primary_metric:
                bot_agg = CalculationEngine.aggregate_by(df, primary_dim, primary_metric, "sum", top_n=3, sort_desc=False)
                if "data" in bot_agg and bot_agg["data"]:
                    worst = bot_agg["data"][0]
                    lines.append(f"1. **Underperforming Segment:** `{worst['category']}` generated only **{worst['value']:,}** in `{primary_metric}`.")

            # Check for high outliers or spikes
            crit = [a for a in anomalies.get("anomalies", []) if a.get("severity") == "Critical"]
            if crit:
                lines.append(f"2. **Operational Volatility:** {len(crit)} critical deviations detected. Example: Row {crit[0]['row_index']} in `{crit[0]['primary_feature']}` deviated by {crit[0]['z_score']}σ.")

            # Check trends
            if trends.get("findings"):
                for f in trends["findings"][:2]:
                    lines.append(f"3. **Trend Shift:** {f['title']}. {f['description']}")

            lines.append("\n**Actionable Recommendation:** Audit discount caps and pricing elasticity in lower segments, and set automated threshold triggers to catch sudden drops early.")

            return {
                "answer": "\n".join(lines),
                "query_executed": "anomaly_detector.evaluate(df) + trend_analyzer.evaluate(df)",
                "data_table": [a["row_data"] for a in anomalies.get("anomalies", [])[:5] if "row_data" in a],
                "chart_spec": None,
                "suggested_followups": [
                    "Show all detected anomalies",
                    "How can we improve underperforming categories?",
                    "What are the top opportunities in this data?"
                ]
            }

        # 4. Forecasting Query
        if any(w in q for w in ["forecast", "predict", "future", "projection", "next month", "trend"]):
            fc = ForecastingEngine.forecast_metric(df, horizon_periods=6)
            if fc.get("is_eligible"):
                metrics = fc["metrics"]
                lines = [
                    f"### Predictive Time-Series Forecast for **{fc['target_metric_column']}**",
                    f"- **Historical Average:** {metrics['recent_historical_avg']:,}",
                    f"- **Projected Average:** {metrics['projected_avg']:,}",
                    f"- **Trajectory:** **{metrics['trend_direction']}** ({metrics['projected_growth_rate_pct']}% expected change)",
                    f"- **Prediction Interval:** 95% Confidence Bounds",
                    f"\n**Strategic Guidance:** {fc['recommendation']}"
                ]
                return {
                    "answer": "\n".join(lines),
                    "query_executed": f"ExponentialSmoothing(df['{fc['target_metric_column']}'], trend='add').forecast(6)",
                    "data_table": fc["forecast_data"],
                    "chart_spec": {
                        "type": "forecast_line",
                        "title": f"Forecast for {fc['target_metric_column']}",
                        "xKey": "date",
                        "yKey": "actual",
                        "forecastKey": "forecast",
                        "data": fc["combined_chart_data"]
                    },
                    "suggested_followups": [
                        "Forecast over 12 periods instead",
                        "Show seasonality breakdown",
                        "What factors influence this forecast?"
                    ]
                }

        # 5. General Summary & Overview
        overview_lines = [
            f"### Comprehensive Data Analyst Overview",
            f"Analyzed **{profile.get('total_rows'):,} rows** and **{profile.get('total_columns')} columns** in the `{profile.get('inferred_domain')}` domain.\n",
            f"- **Primary Performance Driver:** `{primary_metric}` (Total: **{df[primary_metric].sum():,}**, Avg: **{df[primary_metric].mean():.2f}**)" if primary_metric else "",
            f"- **Core Business Dimension:** `{primary_dim}` ({df[primary_dim].nunique()} unique categories)" if primary_dim else "",
            f"- **Data Integrity Score:** **{profile.get('data_health_score')}%** ({profile.get('duplicate_rows_count')} duplicates, {profile.get('total_outliers')} outliers).",
        ]

        # Top 3 categories
        if primary_dim and primary_metric:
            top_3 = CalculationEngine.aggregate_by(df, primary_dim, primary_metric, top_n=3)["data"]
            overview_lines.append("\n**Top Contributing Segments:**")
            for t in top_3:
                overview_lines.append(f"- **{t['category']}**: {t['value']:,} ({t.get('share_percentage', 0)}%)")

        overview_lines.append("\n**Recommended Next Action:** Use the quick questions below or query specific product, regional, or financial comparisons.")

        return {
            "answer": "\n".join(overview_lines),
            "query_executed": f"df.describe() + df.groupby('{primary_dim}')['{primary_metric}'].sum()",
            "data_table": profile.get("executive_kpis", []),
            "chart_spec": {
                "type": "bar",
                "title": f"Distribution by {primary_dim}",
                "xKey": "category",
                "yKey": "value",
                "data": CalculationEngine.aggregate_by(df, primary_dim, primary_metric, top_n=6).get("data", [])
            } if primary_dim and primary_metric else None,
            "suggested_followups": [
                f"What are my best-performing {primary_dim}?",
                "Detect anomalies in this dataset",
                "Generate executive recommendations"
            ]
        }

    @staticmethod
    async def _query_gemini(
        query: str,
        df: pd.DataFrame,
        profile: Dict[str, Any],
        chat_history: List[Dict[str, Any]],
        api_key: str
    ) -> Dict[str, Any]:
        # Precompute summary statistics to inject directly
        num_cols = profile.get("numeric_columns", [])
        cat_cols = profile.get("categorical_columns", [])
        
        system_prompt = (
            "You are DataPilot AI, an elite Senior Data Analyst and Chief Strategy Advisor. "
            "You are analyzing an uploaded business dataset. "
            "CRITICAL RULE: You must NEVER hallucinate or invent numbers. Base all statements strictly on the dataset facts and calculations provided. "
            "Format your answer in professional executive markdown with clear headings, bullet points, exact numbers, percentages, and actionable strategic takeaways. "
            "Include a JSON block at the end with this format:\n"
            "```json\n"
            "{\n"
            '  "chart_type": "bar" | "line" | "pie" | "none",\n'
            '  "chart_title": "string",\n'
            '  "suggested_followups": ["string", "string", "string"]\n'
            "}\n"
            "```"
        )

        dataset_context = f"""
Dataset Overview:
- Domain: {profile.get('inferred_domain')}
- Rows: {profile.get('total_rows')}, Columns: {profile.get('total_columns')}
- Numeric Columns: {', '.join(num_cols[:8])}
- Categorical Columns: {', '.join(cat_cols[:8])}
- Primary Metric: {profile.get('primary_metric')}
- Primary Dimension: {profile.get('primary_dimension')}
- Health Score: {profile.get('data_health_score')}%
- Summary Stats: {json.dumps({k: v for k, v in list(profile.get('numeric_stats', {}).items())[:4]})}
- Top Correlations: {json.dumps(profile.get('top_correlations', [])[:3])}
"""

        messages_payload = [{"role": "user", "parts": [{"text": system_prompt + "\n\n" + dataset_context}]}]
        for m in chat_history[-4:]:
            role = "user" if m.get("role") == "user" else "model"
            messages_payload.append({"role": role, "parts": [{"text": m.get("content", "")}]})
        messages_payload.append({"role": "user", "parts": [{"text": query}]})

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.DEFAULT_MODEL}:generateContent?key={api_key}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json={"contents": messages_payload})
            if resp.status_code != 200:
                raise Exception(f"Gemini API returned status {resp.status_code}: {resp.text}")
            data = resp.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]

        # Parse JSON block if present
        json_match = re.search(r"```json\s*(\{.*?\})\s*```", raw_text, re.DOTALL)
        chart_spec = None
        followups = ["What are the key risks?", "Compare top segments", "Forecast upcoming periods"]
        cleaned_answer = raw_text

        if json_match:
            try:
                parsed_meta = json.loads(json_match.group(1))
                cleaned_answer = raw_text.replace(json_match.group(0), "").strip()
                if parsed_meta.get("suggested_followups"):
                    followups = parsed_meta["suggested_followups"]
            except Exception:
                pass

        # If chart requested or primary dim available, generate chart data from actual calculations
        p_dim = profile.get("primary_dimension")
        p_metric = profile.get("primary_metric")
        if p_dim and p_metric:
            agg_data = CalculationEngine.aggregate_by(df, p_dim, p_metric, top_n=6).get("data", [])
            chart_spec = {
                "type": "bar",
                "title": f"{p_metric} by {p_dim}",
                "xKey": "category",
                "yKey": "value",
                "data": agg_data
            }

        return {
            "answer": cleaned_answer,
            "query_executed": f"AI Grounded Analysis against dataset schema and summary metrics",
            "data_table": [],
            "chart_spec": chart_spec,
            "suggested_followups": followups
        }

    @staticmethod
    async def _query_openai(
        query: str,
        df: pd.DataFrame,
        profile: Dict[str, Any],
        chat_history: List[Dict[str, Any]],
        api_key: str
    ) -> Dict[str, Any]:
        base_url = settings.OPENAI_BASE_URL or "https://api.openai.com/v1"
        system_prompt = (
            "You are DataPilot AI, an elite Senior Data Analyst and Chief Strategy Advisor. "
            "You are analyzing an uploaded business dataset. "
            "CRITICAL RULE: You must NEVER hallucinate or invent numbers. Base all statements strictly on the dataset facts and calculations provided. "
            "Format your answer in professional executive markdown with clear headings, bullet points, exact numbers, percentages, and actionable strategic takeaways."
        )

        dataset_context = f"""
Dataset Overview:
- Domain: {profile.get('inferred_domain')}
- Rows: {profile.get('total_rows')}, Columns: {profile.get('total_columns')}
- Numeric Columns: {', '.join(profile.get('numeric_columns', [])[:8])}
- Categorical Columns: {', '.join(profile.get('categorical_columns', [])[:8])}
- Primary Metric: {profile.get('primary_metric')}
- Primary Dimension: {profile.get('primary_dimension')}
- Summary Stats: {json.dumps({k: v for k, v in list(profile.get('numeric_stats', {}).items())[:4]})}
"""

        messages = [
            {"role": "system", "content": system_prompt + "\n\n" + dataset_context}
        ]
        for m in chat_history[-4:]:
            messages.append({"role": m.get("role", "user"), "content": m.get("content", "")})
        messages.append({"role": "user", "content": query})

        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{base_url}/chat/completions",
                headers=headers,
                json={"model": "gpt-4o-mini", "messages": messages, "temperature": 0.2}
            )
            if resp.status_code != 200:
                raise Exception(f"OpenAI API error {resp.status_code}: {resp.text}")
            data = resp.json()
            answer_text = data["choices"][0]["message"]["content"]

        p_dim = profile.get("primary_dimension")
        p_metric = profile.get("primary_metric")
        chart_spec = None
        if p_dim and p_metric:
            agg_data = CalculationEngine.aggregate_by(df, p_dim, p_metric, top_n=6).get("data", [])
            chart_spec = {
                "type": "bar",
                "title": f"{p_metric} by {p_dim}",
                "xKey": "category",
                "yKey": "value",
                "data": agg_data
            }

        return {
            "answer": answer_text,
            "query_executed": "Grounded LLM query with calculated summary context",
            "data_table": [],
            "chart_spec": chart_spec,
            "suggested_followups": [
                "What are the biggest operational risks?",
                "Provide detailed category breakdown",
                "Forecast next quarter performance"
            ]
        }
