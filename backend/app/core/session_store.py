import uuid
import time
import pandas as pd
from typing import Dict, Any, Optional, List
from datetime import datetime
from pathlib import Path
from backend.app.core.config import settings

class SessionData:
    def __init__(self, session_id: str, filename: str, file_path: Path, file_type: str):
        self.session_id = session_id
        self.filename = filename
        self.file_path = file_path
        self.file_type = file_type
        self.sheet_names: List[str] = []
        self.active_sheet: Optional[str] = None
        self.df: Optional[pd.DataFrame] = None
        self.created_at = datetime.now()
        self.last_accessed = datetime.now()
        self.chat_history: List[Dict[str, Any]] = []
        self.metadata: Dict[str, Any] = {}
        self.profile_cache: Dict[str, Any] = {}
        
    def touch(self):
        self.last_accessed = datetime.now()


class SessionStore:
    def __init__(self):
        self._sessions: Dict[str, SessionData] = {}
        
    def create_session(self, filename: str, file_path: Path, file_type: str) -> SessionData:
        self.cleanup_expired()
        session_id = str(uuid.uuid4())
        session = SessionData(session_id, filename, file_path, file_type)
        self._sessions[session_id] = session
        return session
        
    def get_session(self, session_id: str) -> Optional[SessionData]:
        session = self._sessions.get(session_id)
        if session:
            session.touch()
        return session
        
    def remove_session(self, session_id: str) -> bool:
        session = self._sessions.pop(session_id, None)
        if session:
            try:
                if session.file_path and session.file_path.exists():
                    session.file_path.unlink()
            except Exception:
                pass
            return True
        return False

    def cleanup_expired(self):
        now = datetime.now()
        expired_ids = []
        for sid, sess in self._sessions.items():
            age_hours = (now - sess.last_accessed).total_seconds() / 3600
            if age_hours > settings.SESSION_TTL_HOURS:
                expired_ids.append(sid)
        for sid in expired_ids:
            self.remove_session(sid)

session_store = SessionStore()
