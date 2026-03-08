from typing import AsyncGenerator
from typing import Dict, TypedDict
import asyncio
import json

class AgentState(TypedDict):
    prompt: str
    agent_output: str
    selected_model: str

async def run_langgraph_stream(prompt: str, model: str = "gpt", history: list = [], attachments: list = None, session_id: str = "default") -> AsyncGenerator[str, None]:
    """Eksekusi agent dengan tool-calling (web search + RAG) secara PARALEL untuk kecepatan maksimal."""
    from app.core.config import settings
    from app.core.ai import ai_manager
    from app.core.tools.search import WebSearchTool, needs_web_search
    from app.core.tools.rag import document_store

    # --- Mapping model agar sesuai dengan registration di manager ---
    # --- Mapping model & Auto-Selection Logic (Orbit Brain) ---
    target_model = model
    lower_prompt = prompt.lower()
    
    # Deteksi Intent untuk Otomatisasi (Orbit Brain)
    if model == "auto" or model == "gpt":
        # 1. Coding intent -> Qwen (Alibaba)
        coding_keywords = ["kode", "coding", "python", "javascript", "html", "css", "react", "programming", "script", "fungsi", "function", "class", "buatkan aplikasi"]
        # 2. Reasoning/Math/Complex intent -> Kimi (Moonshot) or DeepSeek
        reasoning_keywords = ["hitung", "matematika", "analisa", "mengapa", "kenapa", "logika", "filsafat", "philosophy", "rumit", "complex"]
        
        def get_att_type(att):
            return getattr(att, "type", "") if not isinstance(att, dict) else att.get("type", "")

        has_images = any(get_att_type(att).startswith("image/") for att in (attachments or []))
        
        if any(kw in lower_prompt for kw in coding_keywords):
            target_model = "qwen"
        elif any(kw in lower_prompt for kw in reasoning_keywords):
            target_model = "kimi"
        elif "deepseek" in lower_prompt:
            target_model = "deepseek"
        elif "llama" in lower_prompt or has_images:
            target_model = "llama"
        else:
            # Default ke GPT-OSS (Llama 3.1 405B) untuk general chat
            target_model = "gpt"

    try:
        tasks = []
        search_tool = WebSearchTool(api_key=settings.TAVILY_API_KEY)
        
        # Penentuan apakah perlu search & rag
        # Filter attachments: pisahkan gambar (untuk vision) dan dokumen (untuk RAG)
        image_attachments = [att for att in (attachments or []) if get_att_type(att).startswith("image/")]
        doc_attachments = [att for att in (attachments or []) if not get_att_type(att).startswith("image/")]
        
        has_image_atts = len(image_attachments) > 0
        has_doc_atts = len(doc_attachments) > 0
        
        # Jika ada gambar, jangan web search agar fokus ke gambar
        should_search = search_tool.available and needs_web_search(prompt) and not has_image_atts
        # RAG tetap berjalan jika ada dokumen pendukung atau pencarian dokumen diaktifkan
        should_rag = document_store.available and (not has_image_atts or has_doc_atts)

        async def perform_web_search():
            if not should_search: return None
            try:
                search_results = await search_tool.search(prompt)
                if search_results.get("results"):
                    ctx = "=== HASIL PENCARIAN WEB ===\n"
                    for r in search_results["results"][:3]:
                        ctx += f"\n📰 **{r['title']}**\n{r['content']}\n🔗 Sumber: {r['url']}\n"
                    return ctx + "\n=== AKHIR HASIL PENCARIAN ===\n"
            except Exception as e:
                print(f"Web search error: {e}")
            return None

        async def perform_rag_search():
            if not should_rag: return None
            try:
                # Cari di dokumen spesifik untuk session ini
                rag_results = await document_store.search(prompt, session_id=session_id, top_k=3)
                if rag_results:
                    ctx = "=== KONTEKS DOKUMEN ===\n"
                    for r in rag_results:
                        if r["relevance"] > 0.1: # Threshold diturunkan agar lebih permisif
                            ctx += f"\n📄 [{r['filename']}]\n{r['content']}\n"

                    return ctx + "\n=== AKHIR KONTEKS ===\n"
            except Exception as e:
                print(f"RAG search error: {e}")
            return None

        # Jalankan pencarian secara PARALEL
        if should_search or should_rag:
            yield f"data: {json.dumps({'step': 'searching', 'status': 'Menganalisis data terbaru...', 'provider': 'orbit-engine'})}\n\n"
            
            results = await asyncio.gather(perform_web_search(), perform_rag_search())
            context_injections = [res for res in results if res]
            
            if context_injections:
                final_prompt = f"{chr(10).join(context_injections)}\n\nBerdasarkan informasi di atas (utamakan data terbaru), jawab pertanyaan: {prompt}"
            else:
                final_prompt = prompt
        else:
            final_prompt = prompt

        # ===================================================
        # GENERATE STREAM
        # ===================================================
        # HANYA kirim image_attachments ke provider Vision. 
        # Dokumen sudah ditangani oleh RAG (perform_rag_search) di atas via context injection.
        async for chunk in ai_manager.stream(target_model, final_prompt, history=history, attachments=image_attachments):
            if chunk:
                yield f"data: {json.dumps(chunk)}\n\n"
        
        yield f"data: {json.dumps('[DONE]')}\n\n"

    except Exception as e:
        print(f"FATAL ERROR in agent: {e}")
        yield f"data: {json.dumps(f'Error sistem: {str(e)}')}\n\n"
        yield f"data: {json.dumps('[DONE]')}\n\n"
