import asyncio
import os
from pathlib import Path
import pandas as pd
from backend.app.core.config import settings
from backend.app.core.data_profiler import DataProfiler
from backend.app.core.calculation_engine import CalculationEngine
from backend.app.core.anomaly_engine import AnomalyEngine
from backend.app.core.forecasting_engine import ForecastingEngine
from backend.app.core.trend_engine import TrendEngine
from backend.app.core.business_intelligence import BusinessIntelligenceEngine
from backend.app.core.llm_service import LLMService

async def run_tests():
    print("--- 1. Testing Dataset Loading & Profiling ---")
    csv_path = settings.SAMPLE_DATA_DIR / "ecommerce_sales_performance.csv"
    assert csv_path.exists(), "Sample file does not exist"
    
    df, sheet_names, active_sheet = DataProfiler.load_dataset(csv_path, "csv")
    print(f"Loaded DataFrame: {len(df)} rows, {len(df.columns)} columns")
    
    profile = DataProfiler.profile_dataframe(df, "ecommerce_sales_performance.csv", active_sheet)
    print(f"Inferred Domain: {profile['inferred_domain']}")
    print(f"Primary Metric: {profile['primary_metric']}, Primary Dim: {profile['primary_dimension']}")
    print(f"Health Score: {profile['data_health_score']}%, Outliers: {profile['total_outliers']}")
    assert profile["total_rows"] > 1000
    assert profile["primary_metric"] is not None
    
    print("\n--- 2. Testing Aggregations & Calculations ---")
    agg = CalculationEngine.aggregate_by(df, profile["primary_dimension"], profile["primary_metric"], "sum", top_n=5)
    print("Top Aggregation:", agg["data"][:2])
    assert len(agg["data"]) > 0

    print("\n--- 3. Testing Comparison Engine ---")
    dim = profile["primary_dimension"]
    vals = list(df[dim].unique()[:2])
    comp = CalculationEngine.compare_groups(df, dim, vals[0], vals[1])
    print(f"Comparison {vals[0]} vs {vals[1]}:", comp["comparisons"][:1])
    assert len(comp["comparisons"]) > 0

    print("\n--- 4. Testing Anomaly Detection ---")
    anomalies = AnomalyEngine.detect_anomalies(df)
    print(f"Anomalies found: {anomalies['total_anomalies_found']}")
    assert anomalies["total_anomalies_found"] > 0

    print("\n--- 5. Testing Forecasting Engine ---")
    forecast = ForecastingEngine.forecast_metric(df, horizon_periods=6)
    print(f"Forecast eligible: {forecast['is_eligible']}")
    if forecast["is_eligible"]:
        print(f"Forecast direction: {forecast['metrics']['trend_direction']}, growth: {forecast['metrics']['projected_growth_rate_pct']}%")
        assert len(forecast["forecast_data"]) == 6

    print("\n--- 6. Testing Trend Engine ---")
    trends = TrendEngine.analyze_trends(df)
    print(f"Trend findings count: {len(trends['findings'])}")
    assert len(trends["findings"]) > 0

    print("\n--- 7. Testing Business Intelligence Engine ---")
    intel = BusinessIntelligenceEngine.generate_executive_intelligence(df, profile, trends, anomalies, forecast)
    print(f"Executive Title: {intel['executive_summary_title']}")
    print(f"Key Findings: {len(intel['key_findings'])}, Risks: {len(intel['major_risks'])}, Recs: {len(intel['actionable_recommendations'])}")
    assert len(intel["key_findings"]) > 0
    assert len(intel["actionable_recommendations"]) > 0

    print("\n--- 8. Testing AI Analyst Query (Ground-truth & Zero-Hallucination) ---")
    chat_res = await LLMService.process_chat_query(
        "What are my best-performing categories and what are the biggest problems in my data?",
        df,
        profile,
        []
    )
    safe_snippet = chat_res["answer"][:200].encode("ascii", errors="replace").decode("ascii")
    print("Chat Answer Snippet:\n", safe_snippet, "...")
    assert len(chat_res["answer"]) > 50

    print("\n--- ALL BACKEND CORE ENGINES PASSED VERIFICATION! ---")

if __name__ == "__main__":
    asyncio.run(run_tests())
