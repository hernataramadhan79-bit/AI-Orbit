import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse, StreamingResponse

router = APIRouter()

# Local fallback directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    session_id: str = Form(default="default"),
    index_for_rag: bool = Form(default=True)
):
    """
    Upload file ke Supabase Storage (jika tersedia) dengan fallback ke lokal.
    Secara otomatis mengindeks dokumen ke RAG (ChromaDB/SimpleStore).
    Mendukung: PDF, DOCX, TXT, CSV, Markdown, dan gambar.
    """
    try:
        content = await file.read()
        file_extension = os.path.splitext(file.filename)[1].lower()
        content_type = file.content_type or "application/octet-stream"

        # ── 1. Upload ke Supabase Storage (atau lokal jika tidak tersedia) ──────
        file_url = ""
        storage_provider = "local"

        try:
            from app.core.storage import get_storage_manager
            storage = get_storage_manager()

            if storage.available:
                result = await storage.upload(
                    file_bytes=content,
                    original_filename=file.filename,
                    session_id=session_id,
                    content_type=content_type,
                )
                file_url = result["url"]
                storage_provider = "supabase"
                print(f"☁️  Storage: Uploaded '{file.filename}' → Supabase ({file_url})")
            else:
                raise RuntimeError("Supabase Storage tidak tersedia, fallback ke lokal.")

        except Exception as storage_err:
            # Fallback: simpan di folder lokal
            unique_filename = f"{uuid.uuid4().hex}{file_extension}"
            local_path = os.path.join(UPLOAD_DIR, unique_filename)
            with open(local_path, "wb") as f:
                f.write(content)
            file_url = f"/uploads/{unique_filename}"
            storage_provider = "local"
            print(f"💾 Storage: Saved '{file.filename}' locally (reason: {storage_err})")

        # ── 2. RAG Indexing ───────────────────────────────────────────────────
        indexed = False
        chunks_added = 0
        indexable_extensions = {".txt", ".pdf", ".doc", ".docx", ".md", ".csv", ".markdown"}

        if index_for_rag and file_extension in indexable_extensions:
            try:
                from app.core.tools.document_parser import parse_file
                from app.core.tools.rag import document_store

                extracted_text = parse_file(file.filename, content)
                if extracted_text and document_store.available:
                    chunks_added = await document_store.add_document(
                        filename=file.filename,
                        text=extracted_text,
                        session_id=session_id
                    )
                    indexed = chunks_added > 0
                    print(f"📚 RAG: Indexed '{file.filename}' → {chunks_added} chunks (session: {session_id})")
            except Exception as rag_err:
                print(f"⚠️  RAG indexing failed (non-fatal): {rag_err}")

        return {
            "filename": file.filename,
            "url": file_url,
            "type": content_type,
            "indexed": indexed,
            "chunks": chunks_added,
            "storage": storage_provider,
            "message": (
                f"File diindeks dengan {chunks_added} potongan teks dan disimpan di {storage_provider}."
                if indexed
                else f"File diunggah ke {storage_provider} (tidak diindeks)."
            )
        }

    except Exception as e:
        print(f"❌ Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/voice/synthesize")
async def synthesize_voice(request: dict):
    """
    Sintetiskan teks menjadi suara menggunakan ElevenLabs.
    Request body: { "text": "...", "voice_id": "..." (optional) }
    """
    text = request.get("text", "")
    voice_id = request.get("voice_id", None)

    if not text:
        raise HTTPException(status_code=400, detail="Teks tidak boleh kosong.")

    try:
        from app.core.tools.voice import voice_tool

        if not voice_tool:
            raise HTTPException(status_code=503, detail="Voice tool belum diinisialisasi")

        audio_bytes = await voice_tool.synthesize(text, voice_id=voice_id)

        return StreamingResponse(
            iter([audio_bytes]),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=response.mp3",
                "Content-Length": str(len(audio_bytes)),
            }
        )
    except Exception as e:
        print(f"DEBUG VOICE ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents/{session_id}")
async def list_documents(session_id: str = "default"):
    """Tampilkan daftar dokumen yang sudah diindeks untuk sesi tertentu."""
    try:
        from app.core.tools.rag import document_store
        docs = document_store.get_document_list(session_id=session_id)
        return {"session_id": session_id, "documents": docs, "count": len(docs)}
    except Exception as e:
        return {"session_id": session_id, "documents": [], "error": str(e)}


@router.delete("/documents/{session_id}")
async def delete_session_documents(session_id: str):
    """Hapus semua dokumen RAG untuk sesi tertentu (cleanup)."""
    # TODO: implement RAG cleanup per session
    return {"session_id": session_id, "status": "cleanup not yet implemented"}
