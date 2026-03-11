from typing import AsyncGenerator
from typing import Dict, TypedDict
import asyncio
import json

class AgentState(TypedDict):
    prompt: str
    agent_output: str
    selected_model: str

async def run_langgraph_stream(
    prompt: str,
    model: str = "gpt",
    history: list = [],
    attachments: list = None,
    session_id: str = "default"
) -> AsyncGenerator[str, None]:
    """
    Eksekusi agent dengan Orbit Brain Smart Router + parallel tool-calling (web search + RAG).
    """
    try:
        from app.core.config import settings
        from app.core.ai import ai_manager
        from app.core.tools.search import WebSearchTool, needs_web_search
        from app.core.tools.rag import document_store
        from app.agents.router import route

        # ── Helper: detect attachment types ──────────────────────────────────────
        def get_att_type(att):
            return getattr(att, "type", "") if not isinstance(att, dict) else att.get("type", "")

        image_attachments = [att for att in (attachments or []) if get_att_type(att).startswith("image/")]
        doc_attachments   = [att for att in (attachments or []) if not get_att_type(att).startswith("image/")]

        has_images = len(image_attachments) > 0
        has_docs   = len(doc_attachments) > 0

        # ── Orbit Brain: Smart Model Selection ──────────────────────────────────
        decision = route(
            prompt=prompt,
            model_hint=model,
            has_images=has_images,
            has_docs=has_docs,
        )
        target_model = decision.model
        from app.agents.router import MODEL_PROFILES
        profile = MODEL_PROFILES.get(target_model, {"name": target_model.upper()})
        profile_name = profile["name"]

        # Emit routing status so frontend can show which model was chosen
        yield f"data: {json.dumps({'step': 'routing', 'status': f'Menggunakan {profile_name} — {decision.reasoning}', 'provider': target_model})}\n\n"

        search_tool = WebSearchTool(api_key=settings.TAVILY_API_KEY)

        # Jika ada gambar, hindari web search agar fokus ke gambar
        should_search = search_tool.available and needs_web_search(prompt) and not has_images
        # RAG tetap berjalan jika ada dokumen atau pencarian dokumen diaktifkan
        should_rag = document_store.available and (not has_images or has_docs)

        async def perform_web_search():
            if not should_search:
                return None
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
            if not should_rag:
                return None
            try:
                # Timeout 5 detik - lebih cepat dari sebelumnya (10 detik)
                rag_results = await asyncio.wait_for(document_store.search(prompt, session_id=session_id, top_k=3), timeout=5.0)
                if rag_results:
                    ctx = "=== KONTEKS DOKUMEN ===\n"
                    for r in rag_results:
                        if r["relevance"] > 0.1:
                            ctx += f"\n📄 [{r['filename']}]\n{r['content']}\n"
                    return ctx + "\n=== AKHIR KONTEKS ===\n"
            except Exception as e:
                print(f"RAG search error: {e}")
            return None

        # ── Jalankan pencarian secara PARALEL ───────────────────────────────
        if should_search or should_rag:
            search_label = []
            if should_search:
                search_label.append("web")
            if should_rag:
                search_label.append("dokumen")
            status_msg = f"Mencari informasi di {search_label[0]}..." if len(search_label) == 1 else "Mencari di web & dokumen..."

            yield f"data: {json.dumps({'step': 'searching', 'status': status_msg, 'provider': 'orbit-engine'})}\n\n"

            results = await asyncio.gather(perform_web_search(), perform_rag_search())
            context_injections = [res for res in results if res]

            if context_injections:
                final_prompt = (
                    f"{chr(10).join(context_injections)}\n\n"
                    f"Berdasakan informasi di atas (utamakan data terbaru), jawab pertanyaan: {prompt}"
                )
            else:
                final_prompt = prompt
        else:
            final_prompt = prompt

        # ── Emit answering step ──────────────────────────────────────────────
        yield f"data: {json.dumps({'step': 'answering', 'status': f'Menghubungkan ke {target_model}...', 'provider': target_model})}\n\n"

        # ── Generate Streaming Response ──────────────────────────────────────
        # Langsung yield content tanpa menampilkan reasoning process
        async for chunk in ai_manager.stream(target_model, final_prompt, history=history, attachments=image_attachments):
            if chunk:
                yield f"data: {json.dumps(chunk)}\n\n"
             
        yield f"data: {json.dumps('[DONE]')}\n\n"

    except Exception as e:
        import traceback
        error_msg = f"Error sistem: {str(e)}"
        print(f"FATAL ERROR: {error_msg}")
        traceback.print_exc()
        yield f"data: {json.dumps(error_msg)}\n\n"
        yield f"data: {json.dumps('[DONE]')}\n\n"
