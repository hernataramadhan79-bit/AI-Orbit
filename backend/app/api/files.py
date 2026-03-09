import os
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse, StreamingResponse
import uuid

router = APIRouter()

# Directory for uploads
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    session_id: str = Form(default="default"),
    index_for_rag: bool = Form(default=True)
):
    """
    Upload file dan indeks ke RAG (ChromaDB) jika memungkinkan.
    Mendukung PDF, DOCX, TXT, CSV, Markdown.
    """
    try:
        content = await file.read()
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # --- RAG Indexing ---
        indexed = False
        chunks_added = 0
        indexable_extensions = {".txt", ".pdf", ".doc", ".docx", ".md", ".csv", ".markdown"}
        
        if index_for_rag and file_extension.lower() in indexable_extensions:
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
                    print(f"RAG: Indexed '{file.filename}' -> {chunks_added} chunks (session: {session_id})")
            except Exception as rag_err:
                print(f"RAG indexing failed (non-fatal): {rag_err}")
            
        return {
            "filename": file.filename,
            "url": f"/uploads/{unique_filename}",
            "type": file.content_type,
            "indexed": indexed,
            "chunks": chunks_added,
            "message": f"File diindeks dengan {chunks_added} potongan teks." if indexed else "File diunggah (tidak diindeks)."
        }
    except Exception as e:
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

        # synthesize sekarang akan raise exception jika gagal
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
        # Tampilkan error asli (misal: "Quota Exceeded") ke browser
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
