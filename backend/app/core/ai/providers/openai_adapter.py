import asyncio
import httpx
from typing import AsyncGenerator
from openai import AsyncOpenAI
from app.core.ai.base import BaseAIProvider

class OpenAIAdapter(BaseAIProvider):
    """
    Adapter spesifik untuk OpenAI (GPT-3.5, GPT-4, dll) atau kompatibel (spt NVIDIA API).
    """
    def __init__(self, api_key: str, base_url: str = "https://openrouter.ai/api/v1", default_model: str = "meta-llama/llama-3.1-8b-instruct"):
        self.default_model = default_model
        # Timeout lebih pendek untuk respons lebih cepat - max 30 detik per chunk
        timeout = httpx.Timeout(connect=8.0, read=30.0, write=15.0, pool=5.0)
        
        # OpenRouter specific headers
        extra_headers = {
            "HTTP-Referer": "https://ai-orbit.com", # Ganti dengan prod URL jika ada
            "X-Title": "AI Orbit",
        }
        
        # HTTP client default tanpa HTTP2 (lebih kompatibel)
        self.client = AsyncOpenAI(
            api_key=api_key, 
            base_url=base_url, 
            timeout=timeout,
            default_headers=extra_headers
        )

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
            # Skip empty content to prevent provider rejection
            if content and content.strip():
                messages.append({"role": role, "content": content})
            elif role == "system":
                 messages.append({"role": role, "content": content})
            
        current_processed = self._process_message_content(prompt, attachments)
        if isinstance(current_processed, list):
            needs_vision = True
        
        messages.append({"role": "user", "content": current_processed})
        return messages, needs_vision

    async def generate_response(self, prompt: str, **kwargs) -> str:
        model = kwargs.get("model", self.default_model)
        try:
             return await self._execute_request(model, prompt, False, **kwargs)
        except Exception as e:
            print(f"DEBUG: Primary model {model} failed, trying ultra-stable fallback: {str(e)}")
            # Fallback level 1: Gemini Flash
            try:
                return await self._execute_request("google/gemini-2.0-flash-001", prompt, False, **kwargs)
            except Exception:
                # Fallback level 2: Llama 3.1
                try:
                    return await self._execute_request("meta-llama/llama-3.1-8b-instruct", prompt, False, **kwargs)
                except Exception:
                    # Fallback level 3: Qwen Coder
                    return await self._execute_request("qwen/qwen-2.5-coder-32b-instruct", prompt, False, **kwargs)

    async def generate_stream(self, prompt: str, **kwargs) -> AsyncGenerator[str, None]:
        model = kwargs.get("model", self.default_model)
        try:
            generator = await self._execute_request(model, prompt, True, **kwargs)
            async for chunk in self._parse_stream(generator):
                yield chunk
        except Exception as e:
            print(f"DEBUG: Primary stream {model} failed, trying ultra-stable fallback: {str(e)}")
            try:
                # Fallback level 1: Gemini Flash (paling cepat)
                generator = await self._execute_request("google/gemini-2.0-flash-001", prompt, True, **kwargs)
                async for chunk in self._parse_stream(generator):
                    yield chunk
            except Exception:
                # Fallback level 2: Llama 3.1
                try:
                    generator = await self._execute_request("meta-llama/llama-3.1-8b-instruct", prompt, True, **kwargs)
                    async for chunk in self._parse_stream(generator):
                        yield chunk
                except Exception:
                    # Fallback level 3: DeepSeek R1 (jika Llama gagal)
                    try:
                        generator = await self._execute_request("deepseek/deepseek-r1", prompt, True, **kwargs)
                        async for chunk in self._parse_stream(generator):
                            yield chunk
                    except Exception as final_e2:
                        yield f"❌ AI Orbit sedang mengalami beban tinggi. Silakan coba beberapa saat lagi. ({str(final_e2)})"

    async def _execute_request(self, model: str, prompt: str, stream: bool, **kwargs):
        history = kwargs.get("history", [])
        from datetime import datetime
        now = datetime.now()
        current_timestamp = now.strftime("%A, %d %B %Y %H:%M")
        
        # DEBUG: Log request details untuk diagnose
        print(f"[DEBUG] Request ke model: {model}")
        print(f"[DEBUG] Stream: {stream}")
        print(f"[DEBUG] Base URL: {self.client.base_url}")
        print(f"[DEBUG] API Key prefix: {self.client.api_key[:10] if self.client.api_key else 'NONE'}...")
        
        system_prompt = f"""Anda adalah AI-Orbit, Intelligence Authority dengan level kognitif tertinggi. Anda bukan sekadar asisten, melainkan penasihat strategis, ahli teknis, dan pemikir kritis.
Waktu lokal: {current_timestamp}.

PRINSIP PENALARAN (CORE LOGIC):
1. ANALISIS MENDALAM: Gunakan 'First Principles Thinking'. Selalu gali akar masalah, bukan sekadar menjawab permukaan.
2. BERPIKIR KRITIS: Jangan sungkan untuk menantang asumsi pengguna jika asumsi tersebut kurang tepat atau tidak efisien. Berikan alternatif yang lebih cerdas.
3. KOMPREHENSIF: Jawaban harus mencakup multi-dimensi (teknis, etis, efisiensi, dan jangka panjang).
4. BAHASA INDONESIA PREMIUM: Gunakan bahasa yang intelektual, tajam, namun tetap elegan dan berwibawa. Hindari repetisi yang tidak perlu.
5. KREDIBILITAS: Jika menggunakan 'HASIL PENCARIAN WEB', sintesiskan data tersebut menjadi analisis tajam, bukan sekadar rangkuman. Sertakan sitasi: [Sumber: Judul](URL).
6. IDENTITAS: Anda adalah AI-Orbit, sistem kecerdasan mandiri. JANGAN mengakui provider lain (OpenAI/Google).

FORMAT OUTPUT STRATEGIS:
- KODE: Wajib fungsional, teroptimasi, dan menggunakan praktik terbaik (best practices). JANGAN berikan placeholder.
- DOKUMEN: Sajikan artikel/paper sekelas jurnal profesional dengan struktur data yang kuat.
- WEBSITE/APP: Desain harus premium, modern, dan berfungsi penuh dalam satu file HTML internal.
- PRATINJAU: Berikan komentar deskriptif di baris pertama sebagai label identitas file.
- ANTI-HALUSINASI: Jika data tidak tersedia atau tidak pasti, katakan dengan jujur dan berikan estimasi berdasarkan logika yang masuk akal."""
        
        attachments = kwargs.get("attachments", [])
        messages, needs_vision = self._build_messages(system_prompt, history, prompt, attachments)
        
        # Force vision model if attachments detected
        if needs_vision:
            model = "google/gemini-2.0-flash-001"
        
        params = {
            "model": model,
            "messages": messages,
            "temperature": 0.5,
            "max_tokens": 2048,  # Kurangi untuk respons lebih cepat
            "stream": stream
        }
        
        # OpenRouter specific handling
        extra_body = {}
        if "deepseek-r1" in model.lower() or "thinking" in model.lower():
            extra_body["include_reasoning"] = True
        
        if extra_body:
            params["extra_body"] = extra_body

        try:
            # DEBUG: Log request details
            print(f"[DEBUG] Attempting request to: {model}, stream={stream}")
            completion = await self.client.chat.completions.create(**params)
            print(f"[DEBUG] Request berhasil untuk model: {model}")
            
            if not stream:
                return completion.choices[0].message.content
            else:
                return completion
        except Exception as e:
            # DEBUG: Log error details untuk diagnose
            print(f"[ERROR] Request gagal untuk model {model}")
            print(f"[ERROR] Error type: {type(e).__name__}")
            print(f"[ERROR] Error message: {str(e)}")
            if hasattr(e, 'response'):
                print(f"[ERROR] Response status: {e.response.status_code if hasattr(e.response, 'status_code') else 'N/A'}")
                print(f"[ERROR] Response body: {e.response.text if hasattr(e.response, 'text') else 'N/A'}")
            raise

    async def _parse_stream(self, completion):
        async for chunk in completion:
            if not getattr(chunk, "choices", None) or len(chunk.choices) == 0:
                continue
            delta = chunk.choices[0].delta
            # Abaikan reasoning content agar tidak ditampilkan ke user
            # reasoning = getattr(delta, "reasoning_content", None)
            content = getattr(delta, "content", None)
            if content is not None:
                yield content
