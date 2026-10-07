import shutil
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from backend.app.core.config import settings
from backend.app.core.session_store import session_store
from backend.app.core.data_profiler import DataProfiler

router = APIRouter(prefix="/upload", tags=["Upload"])

class SheetSelectRequest(BaseModel):
    session_id: str
    sheet_name: str

class SampleLoadRequest(BaseModel):
    sample_id: str

@router.post("")
async def upload_file(file: UploadFile = File(...)):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{suffix}'. Allowed: .csv, .xlsx, .xls")

    file_type = "excel" if suffix in [".xlsx", ".xls"] else "csv"
    temp_file_path = settings.UPLOAD_DIR / f"upload_{file.filename}"

    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save upload: {str(e)}")

    try:
        df, sheet_names, active_sheet = DataProfiler.load_dataset(temp_file_path, file_type)
        session = session_store.create_session(file.filename or "uploaded_data", temp_file_path, file_type)
        session.sheet_names = sheet_names
        session.active_sheet = active_sheet
        session.df = df

        profile = DataProfiler.profile_dataframe(df, session.filename, active_sheet)
        session.profile_cache = profile

        return {
            "session_id": session.session_id,
            "filename": session.filename,
            "file_type": session.file_type,
            "sheet_names": sheet_names,
            "active_sheet": active_sheet,
            "profile": profile
        }
    except Exception as e:
        if temp_file_path.exists():
            temp_file_path.unlink()
        raise HTTPException(status_code=400, detail=f"Error reading dataset: {str(e)}")

@router.post("/select-sheet")
async def select_sheet(req: SheetSelectRequest):
    session = session_store.get_session(req.session_id)
    if not session or session.df is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    if req.sheet_name not in session.sheet_names:
        raise HTTPException(status_code=400, detail=f"Sheet '{req.sheet_name}' not found")

    try:
        df, sheet_names, active_sheet = DataProfiler.load_dataset(session.file_path, session.file_type, req.sheet_name)
        session.active_sheet = active_sheet
        session.df = df
        profile = DataProfiler.profile_dataframe(df, session.filename, active_sheet)
        session.profile_cache = profile

        return {
            "session_id": session.session_id,
            "active_sheet": active_sheet,
            "profile": profile
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to switch sheet: {str(e)}")

@router.post("/load-sample")
async def load_sample(req: SampleLoadRequest):
    sample_files = {
        "ecommerce": ("ecommerce_sales_performance.csv", "E-Commerce Sales & Profit"),
        "saas": ("saas_subscription_growth.csv", "SaaS Subscriptions & Churn"),
        "supply_chain": ("supply_chain_logistics.csv", "Supply Chain & Logistics"),
        "hr": ("hr_workforce_attrition.csv", "HR Workforce & Performance")
    }

    if req.sample_id not in sample_files:
        raise HTTPException(status_code=404, detail=f"Unknown sample '{req.sample_id}'")

    filename, label = sample_files[req.sample_id]
    sample_path = settings.SAMPLE_DATA_DIR / filename
    if not sample_path.exists():
        raise HTTPException(status_code=404, detail="Sample dataset file not found on server")

    # Copy to temp upload dir
    temp_path = settings.UPLOAD_DIR / f"sample_{filename}"
    shutil.copyfile(sample_path, temp_path)

    df, sheet_names, active_sheet = DataProfiler.load_dataset(temp_path, "csv")
    session = session_store.create_session(label, temp_path, "csv")
    session.sheet_names = sheet_names
    session.active_sheet = active_sheet
    session.df = df

    profile = DataProfiler.profile_dataframe(df, label, active_sheet)
    session.profile_cache = profile

    return {
        "session_id": session.session_id,
        "filename": label,
        "file_type": "csv",
        "sheet_names": sheet_names,
        "active_sheet": active_sheet,
        "profile": profile
    }
