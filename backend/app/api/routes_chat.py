from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from backend.app.core.session_store import session_store
from backend.app.core.llm_service import LLMService

router = APIRouter(prefix="/chat", tags=["AI Chat"])

class ChatMessageRequest(BaseModel):
    message: str
    api_key_override: Optional[str] = None
    provider_override: Optional[str] = None

@router.post("/{session_id}/message")
async def send_chat_message(session_id: str, req: ChatMessageRequest):
    session = session_store.get_session(session_id)
    if not session or session.df is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    user_msg = {
        "role": "user",
        "content": req.message,
        "timestamp": datetime.now().isoformat()
    }
    session.chat_history.append(user_msg)

    # Process query
    result = await LLMService.process_chat_query(
        query=req.message,
        df=session.df,
        profile=session.profile_cache,
        chat_history=session.chat_history,
        api_key_override=req.api_key_override,
        provider_override=req.provider_override
    )

    assistant_msg = {
        "role": "assistant",
        "content": result.get("answer", ""),
        "query_executed": result.get("query_executed"),
        "data_table": result.get("data_table"),
        "chart_spec": result.get("chart_spec"),
        "suggested_followups": result.get("suggested_followups", []),
        "timestamp": datetime.now().isoformat()
    }
    session.chat_history.append(assistant_msg)

    return assistant_msg

@router.get("/{session_id}/history")
async def get_chat_history(session_id: str):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    return {"history": session.chat_history}

@router.delete("/{session_id}/clear")
async def clear_chat_history(session_id: str):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    session.chat_history = []
    return {"status": "cleared"}
