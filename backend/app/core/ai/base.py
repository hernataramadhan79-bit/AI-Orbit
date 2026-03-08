from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Dict

class BaseAIProvider(ABC):
    """
    Abstract Base Class untuk AI Providers.
    Semua provider baru (OpenAI, Anthropic, Local) HARUS mengimplementasikan class ini.
    """
    
    @abstractmethod
    async def generate_response(self, prompt: str, **kwargs) -> str:
        """Menghasilkan teks sekaligus (non-streaming)"""
        pass

    @abstractmethod
    async def generate_stream(self, prompt: str, **kwargs) -> AsyncGenerator[str, None]:
        """Menghasilkan teks secara bertahap (Server-Sent Events streaming)"""
        pass
