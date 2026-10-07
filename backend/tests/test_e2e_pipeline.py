import httpx
import json

def test_full_pipeline():
    base_url = "http://127.0.0.1:8000"
    client = httpx.Client(base_url=base_url, timeout=30.0)

    print("[1] Testing Health Endpoint...")
    r = client.get("/api/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print("    Health:", r.json())

    print("[2] Testing Frontend SPA Root...")
    r = client.get("/")
    assert r.status_code == 200, "Frontend index.html failed to serve"
    assert "<!doctype html>" in r.text.lower() or "<html" in r.text.lower()
    print("    Frontend SPA served successfully!")

    print("[3] Testing 1-Click Sample Loading (E-Commerce)...")
    r = client.post("/api/upload/load-sample", json={"sample_id": "ecommerce"})
    assert r.status_code == 200, f"Load sample failed: {r.text}"
    sample_data = r.json()
    session_id = sample_data["session_id"]
    profile = sample_data["profile"]
    print(f"    Loaded Session: {session_id}")
    print(f"    Rows: {profile['total_rows']}, Cols: {profile['total_columns']}, Domain: {profile['inferred_domain']}")

    print("[4] Testing Profile Analysis Endpoint...")
    r = client.get(f"/api/analysis/{session_id}/profile")
    assert r.status_code == 200
    p = r.json()
    assert p["total_rows"] > 1000
    print("    Profile retrieved successfully.")

    print("[5] Testing Auto Visualizations...")
    r = client.get(f"/api/visualize/{session_id}/auto-charts")
    assert r.status_code == 200
    charts = r.json()["charts"]
    print(f"    Generated {len(charts)} auto-charts: {[c['title'] for c in charts[:3]]}")
    assert len(charts) >= 3

    print("[6] Testing Comparison Engine...")
    r = client.get(f"/api/compare/{session_id}/options")
    assert r.status_code == 200
    comp_opts = r.json()
    first_dim = comp_opts["dimensions"][0]
    first_vals = comp_opts["values_by_dimension"][first_dim][:2]
    
    r = client.post(f"/api/compare/{session_id}/execute", json={
        "dimension": first_dim,
        "entity1": first_vals[0],
        "entity2": first_vals[1]
    })
    assert r.status_code == 200
    comp_res = r.json()
    print(f"    Compared {first_vals[0]} vs {first_vals[1]}: Winner = {comp_res['overall_winner']}")

    print("[7] Testing Trends & Seasonality Engine...")
    r = client.get(f"/api/trends/{session_id}")
    assert r.status_code == 200
    trends = r.json()
    print(f"    Macro Trend Findings: {len(trends['findings'])}, Points: {len(trends['periodic_chart'])}")
    assert len(trends["findings"]) > 0

    print("[8] Testing Anomaly Detection Engine...")
    r = client.get(f"/api/anomalies/{session_id}")
    assert r.status_code == 200
    anomalies = r.json()
    print(f"    Anomalies Detected: {anomalies['total_anomalies_found']}")
    assert anomalies["total_anomalies_found"] > 0

    print("[9] Testing AI Forecasting Engine...")
    r = client.get(f"/api/forecast/{session_id}?horizon=6")
    assert r.status_code == 200
    fc = r.json()
    print(f"    Forecast Eligible: {fc['is_eligible']}, Growth: {fc['metrics']['projected_growth_rate_pct']}%")
    assert fc["is_eligible"] is True

    print("[10] Testing Natural Language AI Analyst...")
    r = client.post(f"/api/chat/{session_id}/message", json={
        "message": "What are my best-performing categories and what are the biggest problems in my data?"
    })
    assert r.status_code == 200
    chat_ans = r.json()
    print("    AI Answer received with length:", len(chat_ans["content"]))
    print("    Query Proof:", chat_ans.get("query_executed"))
    assert len(chat_ans["content"]) > 50

    print("[11] Testing Downloadable HTML/PDF Executive Report...")
    r = client.get(f"/api/report/{session_id}/download-html")
    assert r.status_code == 200
    assert "<!DOCTYPE html>" in r.text
    assert "DataPilot AI" in r.text
    print("    Executive printable HTML generated cleanly (size:", len(r.text), "bytes)")

    print("[12] Testing File Upload directly via multipart form...")
    with open("sample_data/saas_subscription_growth.csv", "rb") as f:
        r = client.post("/api/upload", files={"file": ("saas_test.csv", f, "text/csv")})
    assert r.status_code == 200, f"Upload CSV failed: {r.text}"
    saas_session = r.json()["session_id"]
    print(f"    Direct CSV upload verified! New session: {saas_session}")

    print("\n=======================================================")
    print("  ALL 12 END-TO-END PIPELINE WORKFLOWS PASSED!")
    print("=======================================================")

if __name__ == "__main__":
    test_full_pipeline()
