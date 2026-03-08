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
    NVIDIA_API_KEY_GPT: str = "your-key-here"
    NVIDIA_API_KEY_DEEPSEEK: str = "your-key-here"
    NVIDIA_API_KEY_LLAMA: str = "your-key-here"
    NVIDIA_API_KEY_QWEN: str = "your-key-here"
    NVIDIA_API_KEY_KIMI: str = "your-key-here"
    
    DEFAULT_MODEL_GPT: str = "meta/llama-3.1-405b-instruct"
    DEFAULT_MODEL_DEEPSEEK: str = "deepseek-ai/deepseek-v3.2"
    DEFAULT_MODEL_LLAMA: str = "meta/llama-3.3-70b-instruct"
    DEFAULT_MODEL_QWEN: str = "qwen/qwen3-next-80b-a3b-instruct"
    DEFAULT_MODEL_KIMI: str = "moonshotai/kimi-k2.5"


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
