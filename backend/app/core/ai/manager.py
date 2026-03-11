from typing import Dict, AsyncGenerator
from .base import BaseAIProvider

class AIManager:
    """
    Orchestrator utama untuk memanggil berbagai model AI.
    LangGraph Supervisor akan menggunakan class ini untuk mengeksekusi prompt.
    """
    def __init__(self):
        self._providers: Dict[str, BaseAIProvider] = {}

    def register_provider(self, name: str, provider: BaseAIProvider) -> None:
        """Mendaftarkan provider ke registry"""
        self._providers[name] = provider

    def get_provider(self, name: str) -> BaseAIProvider:
        """Mengambil provider yang sudah diregistrasi"""
        provider = self._providers.get(name)
        if not provider:
            raise ValueError(f"Provider '{name}' tidak ditemukan. Pastikan sudah diregister.")
        return provider

    async def generate(self, provider_name: str, prompt: str, **kwargs) -> str:
        """Routing pemanggilan generate biasa dengan fallback"""
        try:
            provider = self.get_provider(provider_name)
            return await provider.generate_response(prompt, **kwargs)
        except Exception:
            # Fallback ke gpt jika terjadi error
            if provider_name != "gpt":
                provider = self.get_provider("gpt")
                return await provider.generate_response(prompt, **kwargs)
            raise

    async def stream(self, provider_name: str, prompt: str, **kwargs) -> AsyncGenerator[str, None]:
        """Routing pemanggilan streaming dengan fallback"""
        try:
            provider = self.get_provider(provider_name)
            async for chunk in provider.generate_stream(prompt, **kwargs):
                yield chunk
        except Exception as e:
            print(f"DEBUG: Manager stream error for {provider_name}, falling back to 'gpt': {str(e)}")
            if provider_name != "gpt":
                provider = self.get_provider("gpt")
                async for chunk in provider.generate_stream(prompt, **kwargs):
                    yield chunk
            else:
                yield f"❌ Error Final: {str(e)}"

# Singleton instance instance yang akan diinject sebagai dependency
ai_manager = AIManager()
