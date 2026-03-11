from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from app.api.chat import router as chat_router
from app.api.files import router as files_router
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
import os

app = FastAPI(title=settings.PROJECT_NAME)

# Middleware untuk menonaktifkan nginx buffering (WAJIB untuk Hugging Face Spaces)
class DisableBufferingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if "text/event-stream" in response.headers.get("content-type", ""):
            response.headers["X-Accel-Buffering"] = "no"
            response.headers["Cache-Control"] = "no-cache"
        return response

app.add_middleware(DisableBufferingMiddleware)

# Mount folder uploads agar bisa diakses browser
for d in ["uploads", "data/chroma"]:
    os.makedirs(d, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.on_event("startup")
async def startup_event():
    """Inisialisasi semua tools saat server mulai."""
    from app.core.tools.voice import init_voice
    init_voice(settings.ELEVENLABS_API_KEY)
    print(f"AI Orbit Backend started. Tools initialized.")

# Atur CORS untuk Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(chat_router, prefix=settings.API_V1_STR)
app.include_router(files_router, prefix=settings.API_V1_STR)


@app.get("/")
def read_root():
    return {"message": "Welcome to AI Orbit Backend (FastAPI)"}
