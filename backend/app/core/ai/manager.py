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
        """Routing pemanggilan generate biasa"""
        provider = self.get_provider(provider_name)
        return await provider.generate_response(prompt, **kwargs)

    async def stream(self, provider_name: str, prompt: str, **kwargs) -> AsyncGenerator[str, None]:
        """Routing pemanggilan streaming"""
        provider = self.get_provider(provider_name)
        async for chunk in provider.generate_stream(prompt, **kwargs):
            yield chunk

# Singleton instance instance yang akan diinject sebagai dependency
ai_manager = AIManager()
