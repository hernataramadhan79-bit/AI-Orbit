from app.core.ai.manager import ai_manager
from app.core.ai.providers.openai_adapter import OpenAIAdapter
from app.core.config import settings

# Menggunakan NVIDIA API sebagai OpenAI API compatible backend
ai_manager.register_provider("gpt", OpenAIAdapter(
    api_key=settings.NVIDIA_API_KEY_GPT,
    base_url="https://integrate.api.nvidia.com/v1",
    default_model=settings.DEFAULT_MODEL_GPT
))

ai_manager.register_provider("deepseek", OpenAIAdapter(
    api_key=settings.NVIDIA_API_KEY_DEEPSEEK,
    base_url="https://integrate.api.nvidia.com/v1",
    default_model=settings.DEFAULT_MODEL_DEEPSEEK
))

ai_manager.register_provider("llama", OpenAIAdapter(
    api_key=settings.NVIDIA_API_KEY_LLAMA,
    base_url="https://integrate.api.nvidia.com/v1",
    default_model=settings.DEFAULT_MODEL_LLAMA
))

ai_manager.register_provider("qwen", OpenAIAdapter(
    api_key=settings.NVIDIA_API_KEY_QWEN,
    base_url="https://integrate.api.nvidia.com/v1",
    default_model=settings.DEFAULT_MODEL_QWEN
))

ai_manager.register_provider("kimi", OpenAIAdapter(
    api_key=settings.NVIDIA_API_KEY_KIMI,
    base_url="https://integrate.api.nvidia.com/v1",
    default_model=settings.DEFAULT_MODEL_KIMI
))


# Contoh menambahkan provider lain di masa depan:
# from .providers.anthropic_adapter import AnthropicAdapter
# ai_manager.register_provider("anthropic", AnthropicAdapter(api_key="..."))
