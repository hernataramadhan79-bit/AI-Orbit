import edge_tts
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class VoiceTool:
    """Menghasilkan suara dari teks menggunakan Microsoft Edge TTS (Gratis)."""
    
    def __init__(self, api_key: str = None, default_voice: str = "id-ID-ArdiNeural"):
        # Kita tidak butuh API Key untuk Edge TTS, tapi parameter tetap ada agar tidak merusak init lama
        self.default_voice = default_voice
        self._available = True # Selalu tersedia karena gratis
    
    @property
    def available(self) -> bool:
        return self._available

    async def synthesize(self, text: str, voice_id: Optional[str] = None) -> bytes:
        """Convert text to speech menggunakan Edge TTS."""
        try:
            # Gunakan voice ID yang diberikan atau default (Ardi untuk Indonesia)
            selected_voice = voice_id or self.default_voice
            
            communicate = edge_tts.Communicate(text, selected_voice)
            audio_data = b""
            
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data += chunk["data"]
            
            if not audio_data:
                raise Exception("Gagal menghasilkan data audio dari Edge TTS")
                
            return audio_data
            
        except Exception as e:
            logger.error(f"Edge TTS Error: {e}")
            raise Exception(f"Sistem suara sedang gangguan: {str(e)}")


# Singleton
voice_tool: Optional[VoiceTool] = VoiceTool()

def init_voice(api_key: str):
    # Fungsi ini tetap ada agar main.py tidak error
    global voice_tool
    voice_tool = VoiceTool()
