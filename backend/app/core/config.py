from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Orbit"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "your-super-secret-key-for-jwt-do-not-share"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Supaya mendukung Redis atau Database nantinya
    REDIS_URL: str = "redis://localhost:6379"
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/ai_orbit"

    # AI Provider Keys
    OPENROUTER_API_KEY: str = "your-openrouter-key-here"
    
    # Orbit Intelligence Slots (Powered by OpenRouter)
    # Spesialisasi tugas masing-masing model:
    # - REASONING: Matematika, logika kompleks, analisis mendalam
    # - VISION: Analisis gambar, multimodal
    # - CODING: Generate dan debug code
    # - TURBO: Respons cepat untuk tugas ringan
    DEFAULT_MODEL_GPT: str = "meta-llama/llama-3.1-8b-instruct"  # General Conversation
    DEFAULT_MODEL_REASONING: str = "deepseek/deepseek-r1"  # Reasoning Specialist
    DEFAULT_MODEL_VISION: str = "google/gemini-2.0-flash-001"  # Vision/Multimodal Specialist
    DEFAULT_MODEL_CODER: str = "qwen/qwen-2.5-coder-32b-instruct"  # Coding Specialist
    DEFAULT_MODEL_TURBO: str = "google/gemini-2.0-flash-001"  # Fast Response Specialist
    DEFAULT_MODEL_CLAUDE: str = "meta-llama/llama-3.1-8b-instruct"  # Claude Alternative


    # Tool API Keys
    TAVILY_API_KEY: str = "your-tavily-key-here"
    ELEVENLABS_API_KEY: str = "your-elevenlabs-key-here"
    ELEVENLABS_VOICE_ID: str = "pNInz6obpgDQGcFmaJgB"  # Adam voice (default)

    # Database & Storage
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    CHROMA_PERSIST_PATH: str = "./data/chroma"

    class Config:
        env_file = ".env"

settings = Settings()
