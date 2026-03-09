import httpx
from typing import AsyncGenerator, Optional
import logging

logger = logging.getLogger(__name__)

class VoiceTool:
    """Menghasilkan suara dari teks menggunakan ElevenLabs API."""
    
    def __init__(self, api_key: str, default_voice_id: str = "pNInz6obpgDQGcFmaJgB"):
        self.api_key = api_key
        self.default_voice_id = default_voice_id
        self._available = False
        
        if api_key and api_key != "your-elevenlabs-key-here":
            self._available = True
    
    @property
    def available(self) -> bool:
        return self._available

    async def synthesize(self, text: str, voice_id: Optional[str] = None) -> bytes:
        """Convert text to speech. Return audio bytes or raise Exception."""
        if not self._available:
            raise Exception("ElevenLabs API Key belum dikonfigurasi di server")
        
        vid = voice_id or self.default_voice_id
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{vid}"
        
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": self.api_key,
        }
        payload = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
            }
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                if response.status_code == 200:
                    return response.content
                else:
                    error_data = response.text[:200]
                    error_msg = f"ElevenLabs API Error {response.status_code}: {error_data}"
                    logger.error(error_msg)
                    raise Exception(error_msg)
        except httpx.ConnectError:
            raise Exception("Gagal terhubung ke API ElevenLabs (Masalah jaringan server)")
        except Exception as e:
            logger.error(f"Voice synthesis exception: {e}")
            raise e


# Singleton (key loaded from config)
voice_tool: Optional[VoiceTool] = None

def init_voice(api_key: str):
    global voice_tool
    voice_tool = VoiceTool(api_key=api_key)
