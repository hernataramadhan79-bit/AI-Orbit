from app.core.ai.manager import ai_manager
from app.core.ai.providers.openai_adapter import OpenAIAdapter
from app.core.config import settings

# Menggunakan OpenRouter sebagai aggregator AI model
# Kita meregistrasi berbagai 'profile' yang menggunakan adapter yang sama
common_config = {
    "api_key": settings.OPENROUTER_API_KEY,
    "base_url": "https://openrouter.ai/api/v1"
}

ai_manager.register_provider("gpt", OpenAIAdapter(default_model=settings.DEFAULT_MODEL_GPT, **common_config))
ai_manager.register_provider("claude", OpenAIAdapter(default_model=settings.DEFAULT_MODEL_CLAUDE, **common_config))
ai_manager.register_provider("vision", OpenAIAdapter(default_model=settings.DEFAULT_MODEL_VISION, **common_config))
ai_manager.register_provider("coder", OpenAIAdapter(default_model=settings.DEFAULT_MODEL_CODER, **common_config))
ai_manager.register_provider("reasoning", OpenAIAdapter(default_model=settings.DEFAULT_MODEL_REASONING, **common_config))
ai_manager.register_provider("turbo", OpenAIAdapter(default_model=settings.DEFAULT_MODEL_TURBO, **common_config))


# Contoh menambahkan provider lain di masa depan:
# from .providers.anthropic_adapter import AnthropicAdapter
# ai_manager.register_provider("anthropic", AnthropicAdapter(api_key="..."))
