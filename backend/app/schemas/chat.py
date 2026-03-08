from pydantic import BaseModel, Field, field_validator
import re
from typing import Optional, List

class Attachment(BaseModel):
    name: str = ""
    type: str = ""
    url: str = ""

class ChatMessage(BaseModel):
    role: str
    content: str
    attachments: Optional[List[Attachment]] = None

class ChatRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=100000, description="Pesan dari user")
    model: str = Field("gpt", description="Provider AI yang digunakan")
    history: list[ChatMessage] = Field(default=[], description="Riwayat percakapan sebelumnya")
    attachments: Optional[List[Attachment]] = None
    session_id: Optional[str] = Field(None, description="ID sesi untuk RAG context")

    def validate_no_injection(cls, value):
        # Contoh filter sederhana untuk mencegah SQL Injection & System Prompt Injection (contoh: bypass system, drop table)
        suspected_patterns = [
            r"(?i)(drop\s+table)",
            r"(?i)(ignore\s+all\s+previous\s+instructions)"
        ]
        for pattern in suspected_patterns:
            if re.search(pattern, value):
                raise ValueError("Potensi Prompt/SQL Injection terdeteksi!")
        return value

class ChatResponse(BaseModel):
    response: str
    model_used: str
