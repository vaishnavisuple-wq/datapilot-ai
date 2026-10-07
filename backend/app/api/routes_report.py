from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from backend.app.core.session_store import session_store
from backend.app.core.business_intelligence import BusinessIntelligenceEngine
from backend.app.core.trend_engine import TrendEngine
from backend.app.core.anomaly_engine import AnomalyEngine
from backend.app.core.forecasting_engine import ForecastingEngine
from datetime import datetime

router = APIRouter(prefix="/report", tags=["Reports"])

@router.get("/{session_id}/executive-intelligence")
async def get_executive_intelligence(session_id: str):
    session = session_store.get_session(session_id)
    if not session or session.df is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    trends = TrendEngine.analyze_trends(session.df)
    anomalies = AnomalyEngine.detect_anomalies(session.df)
    forecast = ForecastingEngine.forecast_metric(session.df)

    intel = BusinessIntelligenceEngine.generate_executive_intelligence(
        df=session.df,
        profile=session.profile_cache,
        trends=trends,
        anomalies=anomalies,
        forecast=forecast
    )
    return intel

@router.get("/{session_id}/full-report")
async def get_full_report(session_id: str):
    session = session_store.get_session(session_id)
    if not session or session.df is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    trends = TrendEngine.analyze_trends(session.df)
    anomalies = AnomalyEngine.detect_anomalies(session.df)
    forecast = ForecastingEngine.forecast_metric(session.df)
    intel = BusinessIntelligenceEngine.generate_executive_intelligence(
        df=session.df,
        profile=session.profile_cache,
        trends=trends,
        anomalies=anomalies,
        forecast=forecast
    )

    return {
        "metadata": {
            "title": f"DataPilot AI - Strategic Intelligence Report",
            "filename": session.filename,
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "domain": session.profile_cache.get("inferred_domain"),
            "health_score": session.profile_cache.get("data_health_score"),
            "rows": session.profile_cache.get("total_rows"),
            "columns": session.profile_cache.get("total_columns")
        },
        "kpis": session.profile_cache.get("executive_kpis", []),
        "intelligence": intel,
        "trends": trends,
        "anomalies": anomalies.get("anomalies", [])[:10],
        "forecast": forecast if forecast.get("is_eligible") else None
    }

@router.get("/{session_id}/download-html", response_class=HTMLResponse)
async def download_html_report(session_id: str):
    session = session_store.get_session(session_id)
    if not session or session.df is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    trends = TrendEngine.analyze_trends(session.df)
    anomalies = AnomalyEngine.detect_anomalies(session.df)
    forecast = ForecastingEngine.forecast_metric(session.df)
    intel = BusinessIntelligenceEngine.generate_executive_intelligence(
        df=session.df,
        profile=session.profile_cache,
        trends=trends,
        anomalies=anomalies,
        forecast=forecast
    )

    profile = session.profile_cache
    now_str = datetime.now().strftime("%B %d, %Y - %H:%M UTC")

    # Build KPI cards HTML
    kpis_html = ""
    for kpi in profile.get("executive_kpis", [])[:4]:
        kpis_html += f"""
        <div class="kpi-card">
            <div class="kpi-label">{kpi['label']}</div>
            <div class="kpi-value">{kpi['total']:,.2f}</div>
            <div class="kpi-sub">Avg: {kpi['average']:,.2f} | Range: [{kpi['min']:,} - {kpi['max']:,}]</div>
        </div>
        """

    # Build Key Findings HTML
    findings_html = ""
    for f in intel.get("key_findings", []):
        findings_html += f"""
        <div class="item-card">
            <h4>{f['title']}</h4>
            <p><strong>Evidence:</strong> {f['evidence']}</p>
            <p class="muted"><strong>Impact:</strong> {f['impact']}</p>
        </div>
        """

    # Build Risks HTML
    risks_html = ""
    for r in intel.get("major_risks", []):
        sev_class = "badge-high" if r.get("severity") == "High" else "badge-med"
        risks_html += f"""
        <div class="item-card border-red">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4>{r['title']}</h4>
                <span class="badge {sev_class}">{r.get('severity', 'Warning')}</span>
            </div>
            <p>{r['description']}</p>
        </div>
        """

    # Build Recommendations HTML
    recs_html = ""
    for rec in intel.get("actionable_recommendations", []):
        recs_html += f"""
        <div class="item-card border-blue">
            <div class="badge badge-area">{rec['area']}</div>
            <p><strong>Finding:</strong> {rec['finding']}</p>
            <p><strong>Recommended Action:</strong> {rec['action']}</p>
            <p class="text-green"><strong>Expected Impact:</strong> {rec['expected_impact']}</p>
        </div>
        """

    # Build Anomalies HTML
    anom_html = ""
    for a in anomalies.get("anomalies", [])[:5]:
        anom_html += f"""
        <tr>
            <td>#{a['row_index']}</td>
            <td><span class="badge {'badge-high' if a['severity'] == 'Critical' else 'badge-med'}">{a['severity']}</span></td>
            <td><strong>{a['primary_feature']}</strong>: {a['value']}</td>
            <td>{a['z_score']}σ</td>
            <td>{a['explanation']}</td>
        </tr>
        """

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DataPilot AI - Executive Report: {session.filename}</title>
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
        body {{ background: #f8fafc; color: #1e293b; padding: 40px 20px; line-height: 1.5; }}
        .container {{ max-width: 900px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }}
        .header {{ display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 30px; }}
        .brand {{ font-size: 24px; font-weight: 800; color: #4f46e5; display: flex; align-items: center; gap: 8px; }}
        .meta {{ text-align: right; font-size: 13px; color: #64748b; }}
        h2 {{ font-size: 20px; color: #0f172a; margin: 28px 0 14px; border-left: 4px solid #4f46e5; padding-left: 10px; }}
        h4 {{ font-size: 16px; color: #1e293b; margin-bottom: 6px; }}
        p {{ font-size: 14px; margin-bottom: 8px; }}
        .muted {{ color: #64748b; }}
        .text-green {{ color: #059669; font-weight: 500; }}
        .kpi-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }}
        .kpi-card {{ background: #f1f5f9; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; }}
        .kpi-label {{ font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; }}
        .kpi-value {{ font-size: 24px; font-weight: 700; color: #0f172a; margin: 4px 0; }}
        .kpi-sub {{ font-size: 11px; color: #64748b; }}
        .item-card {{ background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; }}
        .border-red {{ border-left: 4px solid #ef4444; }}
        .border-blue {{ border-left: 4px solid #3b82f6; }}
        .badge {{ display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }}
        .badge-high {{ background: #fee2e2; color: #991b1b; }}
        .badge-med {{ background: #fef3c7; color: #92400e; }}
        .badge-area {{ background: #e0e7ff; color: #3730a3; margin-bottom: 8px; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }}
        th, td {{ padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }}
        th {{ background: #f8fafc; font-weight: 600; color: #475569; }}
        .conclusion-box {{ background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin-top: 24px; font-size: 15px; color: #1e3a8a; line-height: 1.6; }}
        .actions {{ margin-top: 30px; text-align: center; }}
        .print-btn {{ background: #4f46e5; color: white; padding: 10px 24px; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; }}
        .print-btn:hover {{ background: #4338ca; }}
        @media print {{
            body {{ background: white; padding: 0; }}
            .container {{ box-shadow: none; padding: 20px; }}
            .no-print {{ display: none !important; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="actions no-print" style="margin-bottom: 20px; display: flex; justify-content: flex-end; gap: 10px;">
            <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
        </div>

        <div class="header">
            <div>
                <div class="brand">⚡ DataPilot AI</div>
                <div style="font-size: 14px; color: #475569; margin-top: 4px;">Strategic Executive Intelligence Report</div>
            </div>
            <div class="meta">
                <div><strong>Dataset:</strong> {session.filename}</div>
                <div><strong>Domain:</strong> {profile.get('inferred_domain')}</div>
                <div><strong>Generated:</strong> {now_str}</div>
                <div><strong>Data Health:</strong> {profile.get('data_health_score')}% Integrity</div>
            </div>
        </div>

        <h2>Executive Key Performance Indicators</h2>
        <div class="kpi-grid">
            {kpis_html}
        </div>

        <h2>Executive Key Findings</h2>
        {findings_html}

        <h2>Major Risks & Vulnerabilities</h2>
        {risks_html if risks_html else "<p class='muted'>No high-severity operational risks identified.</p>"}

        <h2>Actionable Business Recommendations</h2>
        {recs_html}

        <h2>Critical Anomalies & Outliers</h2>
        <table>
            <thead>
                <tr>
                    <th>Row</th>
                    <th>Severity</th>
                    <th>Feature Value</th>
                    <th>Deviation</th>
                    <th>Explanation</th>
                </tr>
            </thead>
            <tbody>
                {anom_html if anom_html else "<tr><td colspan='5'>No statistical anomalies detected.</td></tr>"}
            </tbody>
        </table>

        <h2>Final Conclusion & Strategic Outlook</h2>
        <div class="conclusion-box">
            {intel.get('final_conclusion')}
        </div>
    </div>
</body>
</html>
"""
    return HTMLResponse(content=html)
