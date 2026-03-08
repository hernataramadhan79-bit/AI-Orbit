from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.schemas.chat import ChatRequest
from app.core.security import verify_token
from app.agents.graf import run_langgraph_stream

router = APIRouter()

from app.core.auth import get_optional_user

@router.post("/chat/stream")
async def chat_stream_endpoint(request: ChatRequest, user: dict = Depends(get_optional_user)):
    """
    Endpoint utama yang akan diakses Frontend lewat Server-Sent Events.
    Mendukung identitas user secara opsional.
    """
    # Mengembalikan response streaming tipe text/event-stream
    # Header X-Accel-Buffering: no WAJIB untuk menonaktifkan nginx buffering di Hugging Face
    return StreamingResponse(
        run_langgraph_stream(
            request.prompt, 
            request.model, 
            request.history, 
            request.attachments, 
            session_id=request.session_id or "default"
        ), 
        media_type="text/event-stream",
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Endpoint non-stream untuk percobaan biasa.
    """
    from app.core.ai import ai_manager
    
    # Hardcode openai untuk non-stream di demo
    response_text = await ai_manager.generate("gpt", request.prompt, history=request.history)
    return {"response": response_text, "model_used": "gpt"}
