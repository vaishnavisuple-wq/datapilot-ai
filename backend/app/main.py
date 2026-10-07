import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from backend.app.core.config import settings
from backend.app.api.routes_upload import router as upload_router
from backend.app.api.routes_analysis import router as analysis_router
from backend.app.api.routes_visualize import router as visualize_router
from backend.app.api.routes_compare import router as compare_router
from backend.app.api.routes_trends import router as trends_router
from backend.app.api.routes_anomalies import router as anomalies_router
from backend.app.api.routes_forecast import router as forecast_router
from backend.app.api.routes_chat import router as chat_router
from backend.app.api.routes_report import router as report_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="DataPilot AI: Autonomous AI Data Analyst and Business Intelligence Engine"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
api_v1 = "/api"
app.include_router(upload_router, prefix=api_v1)
app.include_router(analysis_router, prefix=api_v1)
app.include_router(visualize_router, prefix=api_v1)
app.include_router(compare_router, prefix=api_v1)
app.include_router(trends_router, prefix=api_v1)
app.include_router(anomalies_router, prefix=api_v1)
app.include_router(forecast_router, prefix=api_v1)
app.include_router(chat_router, prefix=api_v1)
app.include_router(report_router, prefix=api_v1)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "llm_provider": settings.DEFAULT_LLM_PROVIDER,
        "has_gemini_key": bool(settings.GEMINI_API_KEY),
        "has_openai_key": bool(settings.OPENAI_API_KEY)
    }

# Mount frontend static distribution if built
frontend_dist_dir = settings.BASE_DIR / "frontend" / "dist"
if frontend_dist_dir.exists():
    app.mount("/assets", StaticFiles(directory=frontend_dist_dir / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = frontend_dist_dir / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist_dir / "index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
