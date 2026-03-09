import asyncio
import httpx
from typing import AsyncGenerator
from openai import AsyncOpenAI
from app.core.ai.base import BaseAIProvider

class OpenAIAdapter(BaseAIProvider):
    """
    Adapter spesifik untuk OpenAI (GPT-3.5, GPT-4, dll) atau kompatibel (spt NVIDIA API).
    """
    def __init__(self, api_key: str, base_url: str = None, default_model: str = "deepseek-ai/deepseek-r1"):
        self.default_model = default_model
        # Timeout write dinaikkan ke 30.0s agar upload gambar besar (Base64) tidak drop ("terhenti sendiri")
        timeout = httpx.Timeout(connect=10.0, read=300.0, write=30.0, pool=10.0)
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url, timeout=timeout)

    def _process_message_content(self, text_content: str, attachments: list) -> list | str:
        """Helper to convert attachments to multimodal content array for Vision models."""
        if not attachments:
            return text_content
        import base64
        import os
        from io import BytesIO
        
        try:
            from PIL import Image
        except ImportError:
            Image = None
            
        content_array = [{"type": "text", "text": text_content}]
        has_image = False
        
        for att in attachments:
            att_url = getattr(att, "url", None) or (att.get("url") if isinstance(att, dict) else None)
            att_type = getattr(att, "type", None) or (att.get("type") if isinstance(att, dict) else "image/jpeg")
            
            if att_url and att_url.startswith('/uploads/'):
                file_path = os.path.join("uploads", os.path.basename(att_url))
                if os.path.exists(file_path):
                    try:
                        if Image:
                            # Resize gambar agar payload tidak melebihi batas token / MB limit provider
                            with Image.open(file_path) as img:
                                if img.mode != 'RGB':
                                    img = img.convert('RGB')
                                img.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
                                buf = BytesIO()
                                img.save(buf, format="JPEG", quality=85)
                                encoded_string = base64.b64encode(buf.getvalue()).decode("utf-8")
                                att_type = "image/jpeg"
                        else:
                            with open(file_path, "rb") as image_file:
                                encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
                                
                        content_array.append({
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{att_type};base64,{encoded_string}"
                            }
                        })
                        has_image = True
                    except Exception as e:
                        print(f"Error loading image: {e}")
        
        return content_array if has_image else text_content

    def _build_messages(self, system_prompt: str, history: list, prompt: str, attachments: list) -> tuple[list, bool]:
        """Builds message array and returns if vision is needed."""
        messages = [{"role": "system", "content": system_prompt}]
        needs_vision = False
        
        for msg in history:
            role = msg.role if hasattr(msg, "role") else msg.get("role")
            content = msg.content if hasattr(msg, "content") else msg.get("content")
            role = "assistant" if role == "ai" else role
            
            # NVIDIA / Llama-3.2-Vision strict requirement: Max 1 image in conversation
            # Jadi kita abaikan gambar dari riwayat (history) dan hanya panggil image_url untuk pesan saat ini.
            messages.append({"role": role, "content": content})
            
        current_processed = self._process_message_content(prompt, attachments)
        if isinstance(current_processed, list):
            needs_vision = True
        
        messages.append({"role": "user", "content": current_processed})
        return messages, needs_vision

    async def generate_response(self, prompt: str, **kwargs) -> str:
        model = kwargs.get("model", self.default_model)
        history = kwargs.get("history", [])
        
        from datetime import datetime
        now = datetime.now()
        current_timestamp = now.strftime("%A, %d %B %Y %H:%M")
        
        system_prompt = f"""Anda adalah AI-Orbit, asisten virtual premium yang cerdas dan berwibawa.
Waktu sekarang adalah: {current_timestamp}.

INSTRUKSI UTAMA:
1. Gunakan Bahasa Indonesia yang formal, sopan, dan profesional.
2. Gunakan kata ganti 'Anda' untuk pengguna dan 'Saya' untuk diri Anda.
3. Sapaan WAJIB menyesuaikan dengan waktu lokal ({current_timestamp}). Contoh: Jika malam hari, jangan menyapa 'Selamat Pagi'.
4. PRIORITAS KONTEKS: Jika terdapat informasi di bawah label 'HASIL PENCARIAN WEB' atau 'KONTEKS DOKUMEN', Anda WAJIB memprioritaskan informasi tersebut.
5. KUTIPAN SUMBER: JIKA DAN HANYA JIKA Anda menggunakan data dari label 'HASIL PENCARIAN WEB' atau 'KONTEKS DOKUMEN', Anda WAJIB menyertakan sumber di akhir kalimat: [Sumber: Judul Berita](URL).
6. Jangan pernah menyebutkan bahwa Anda adalah model bahasa dari OpenAI atau Meta. Anda adalah AI Orbit.
7. Jika ditanya tentang waktu/hari ini, gunakan data: {current_timestamp}."""
        
        attachments = kwargs.get("attachments", [])
        messages, needs_vision = self._build_messages(system_prompt, history, prompt, attachments)
        
        if needs_vision:
            model = "meta/llama-3.2-90b-vision-instruct"
        
        params = {
            "model": model,
            "messages": messages,
            "temperature": 0.2 if "llama" in model.lower() else 0.7,
            "top_p": 0.7 if "llama" in model.lower() else 0.95,
            "max_tokens": 4096 if "llama" in model.lower() else 8192,
            "stream": False
        }
        
        # Thinking/Reasoning specific to DeepSeek R1/Kimi on some providers
        if "deepseek-r1" in model.lower() or "kimi" in model.lower():
            params["extra_body"] = {"chat_template_kwargs": {"thinking": True}}

        completion = await self.client.chat.completions.create(**params)
        return completion.choices[0].message.content

    async def generate_stream(self, prompt: str, **kwargs) -> AsyncGenerator[str, None]:
        model = kwargs.get("model", self.default_model)
        history = kwargs.get("history", [])
        
        from datetime import datetime
        now = datetime.now()
        current_timestamp = now.strftime("%A, %d %B %Y %H:%M")
        
        system_prompt = f"""Anda adalah AI-Orbit, asisten virtual premium yang cerdas dan berwibawa.
Waktu sekarang adalah: {current_timestamp}.

INSTRUKSI UTAMA:
1. Gunakan Bahasa Indonesia yang formal, sopan, dan profesional.
2. Gunakan kata ganti 'Anda' untuk pengguna dan 'Saya' untuk diri Anda.
3. Sapaan WAJIB menyesuaikan dengan waktu lokal ({current_timestamp}). Contoh: Jika malam hari, jangan menyapa 'Selamat Pagi'.
4. PRIORITAS KONTEKS: Jika terdapat informasi di bawah label 'HASIL PENCARIAN WEB' atau 'KONTEKS DOKUMEN', Anda WAJIB memprioritaskan informasi tersebut.
5. KUTIPAN SUMBER: JIKA DAN HANYA JIKA Anda menggunakan data dari label 'HASIL PENCARIAN WEB' atau 'KONTEKS DOKUMEN', Anda WAJIB menyertakan sumber di akhir kalimat: [Sumber: Judul Berita](URL).
6. Jangan pernah menyebutkan bahwa Anda adalah model bahasa dari OpenAI atau Meta. Anda adalah AI Orbit.
7. Jika ditanya tentang waktu/hari ini, gunakan data: {current_timestamp}."""
        
        attachments = kwargs.get("attachments", [])
        messages, needs_vision = self._build_messages(system_prompt, history, prompt, attachments)
        
        if needs_vision:
            model = "meta/llama-3.2-90b-vision-instruct"
            
        params = {
            "model": model,
            "messages": messages,
            "temperature": 0.2 if "llama" in model.lower() else 0.7,
            "top_p": 0.7 if "llama" in model.lower() else 0.95,
            "max_tokens": 4096 if "llama" in model.lower() else 8192,
            "stream": True
        }
        
        # Thinking/Reasoning specific to DeepSeek R1 on some providers
        # Thinking/Reasoning specific to DeepSeek R1/Kimi on some providers
        if "deepseek-r1" in model.lower() or "kimi" in model.lower():
            params["extra_body"] = {"chat_template_kwargs": {"thinking": True}}
            
        completion = await self.client.chat.completions.create(**params)
        
        async for chunk in completion:
            if not getattr(chunk, "choices", None) or len(chunk.choices) == 0:
                continue
                
            delta = chunk.choices[0].delta
            
            # Mendukung DeepSeek Reasoning/Thinking content
            # Jika ada reasoning_content, kita kirimkan juga agar user tahu AI sedang berpikir
            reasoning = getattr(delta, "reasoning_content", None)
            content = getattr(delta, "content", None)
            
            if reasoning is not None:
                # Kita bisa memberikan prefix atau membiarkannya mengalir
                # Untuk UX yang simpel, kita gabungkan saja
                yield reasoning
            elif content is not None:
                yield content

