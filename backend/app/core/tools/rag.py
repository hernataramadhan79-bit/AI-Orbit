"""
Document Intelligence Tool (RAG) — menggunakan ChromaDB untuk vector search.
Memungkinkan AI untuk "membaca" dokumen yang diunggah user sebelum menjawab.
"""
import os
import uuid
from typing import Optional
import asyncio


import json
import numpy as np

class SimpleVectorStore:
    """Fallback engine if ChromaDB is broken - uses NumPy for cosine similarity."""
    def __init__(self, persist_path: str):
        self.path = os.path.join(persist_path, "local_vectors.json")
        self.documents = []
        self.embeddings = []
        self.metadatas = []
        self.load()

    def load(self):
        if os.path.exists(self.path):
            try:
                with open(self.path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.documents = data.get("documents", [])
                    self.embeddings = data.get("embeddings", [])
                    self.metadatas = data.get("metadatas", [])
            except: pass

    def save(self):
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        try:
            with open(self.path, 'w', encoding='utf-8') as f:
                json.dump({"documents": self.documents, "embeddings": self.embeddings, "metadatas": self.metadatas}, f)
        except: pass

    def add(self, documents: list, embeddings: list, metadatas: list):
        self.documents.extend(documents)
        self.embeddings.extend(embeddings)
        self.metadatas.extend(metadatas)
        self.save()

    def query(self, query_emb: list, n_results: int, where: dict):
        if not self.embeddings: return {"documents": [[]], "metadatas": [[]], "distances": [[]]}
        
        # Convert to numpy for faster math
        q = np.array(query_emb[0])
        all_e = np.array(self.embeddings)
        
        # Simpler cosine similarity if normalized
        # But we'll do standard dot product over norms
        scores = np.dot(all_e, q) / (np.linalg.norm(all_e, axis=1) * np.linalg.norm(q) + 1e-9)
        
        # Filter by where session_id
        session_id = where.get("session_id")
        indices = [i for i, m in enumerate(self.metadatas) if m.get("session_id") == session_id]
        if not indices: return {"documents": [[]], "metadatas": [[]], "distances": [[]]}
        
        filtered_scores = scores[indices]
        # Get top K
        top_k_idx = filtered_scores.argsort()[::-1][:n_results]
        
        res_docs = []
        res_meta = []
        res_dist = []
        for idx in top_k_idx:
            orig_idx = indices[idx]
            res_docs.append(self.documents[orig_idx])
            res_meta.append(self.metadatas[orig_idx])
            res_dist.append(1.0 - filtered_scores[idx]) # distance
            
        return {"documents": [res_docs], "metadatas": [res_meta], "distances": [res_dist]}

class DocumentStore:
    """Menyimpan dan mencari dokumen menggunakan ChromaDB (atau SimpleStore jika ChromaDB gagal)."""
    
    def __init__(self, persist_path: str = "./data/chroma"):
        self._client = None
        self._collection = None
        self._available = False
        self._embed_fn = None
        self._persist_path = persist_path
        self._engine = "none"
        
        # Mode 1: Coba ChromaDB (Dibutuhkan untuk performa tinggi, tapi sering error pydantic di Windows)
        try:
            import pydantic.v1 as pyd_v1
            import chromadb
            os.makedirs(persist_path, exist_ok=True)
            self._client = chromadb.PersistentClient(path=persist_path)
            self._collection = self._client.get_or_create_collection(
                name="ai_orbit_docs",
                metadata={"hnsw:space": "cosine"}
            )
            self._available = True
            self._engine = "chromadb"
            print("✅ ChromaDB vector engine activated.")
        except Exception as e:
            # Mode 2: Fallback ke orbit-local (NumPy based)
            try:
                os.makedirs(persist_path, exist_ok=True)
                self._collection = SimpleVectorStore(persist_path)
                self._available = True
                self._engine = "local"
                print("✅ Orbit-Local vector engine activated (Native Python fallback).")
            except Exception as e2:
                print(f"❌ Failed to initialize any vector engine: {e2}")

    @property
    def available(self) -> bool:
        return self._available

    def _get_embedder(self):
        if self._embed_fn is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._embed_fn = SentenceTransformer("all-MiniLM-L6-v2")
            except Exception as e:
                print(f"WARNING: Gagal load embedder: {e}")
        return self._embed_fn

    def _chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
        words = text.split()
        chunks = []
        for i in range(0, len(words), chunk_size - overlap):
            chunk = " ".join(words[i:i + chunk_size])
            if chunk:
                chunks.append(chunk)
        return chunks

    async def add_document(self, filename: str, text: str, session_id: str = "default") -> int:
        if not self._available: return 0
        embedder = self._get_embedder()
        if not embedder: return 0
        chunks = self._chunk_text(text)
        if not chunks: return 0
        
        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(None, lambda: embedder.encode(chunks).tolist())
        ids = [f"{session_id}_{filename}_{i}_{uuid.uuid4().hex[:8]}" for i in range(len(chunks))]
        mats = [{"filename": filename, "session_id": session_id, "chunk_idx": i} for i in range(len(chunks))]
        
        if self._engine == "chromadb":
            self._collection.add(documents=chunks, embeddings=embeddings, ids=ids, metadatas=mats)
        else:
            self._collection.add(documents=chunks, embeddings=embeddings, metadatas=mats)
        return len(chunks)

    async def search(self, query: str, session_id: str = "default", top_k: int = 5) -> list[dict]:
        if not self._available: return []
        embedder = self._get_embedder()
        if not embedder: return []

        try:
            loop = asyncio.get_event_loop()
            query_embedding = await loop.run_in_executor(None, lambda: embedder.encode([query]).tolist())
            if self._engine == "chromadb":
                results = self._collection.query(
                    query_embeddings=query_embedding,
                    n_results=min(top_k, 10),
                    where={"session_id": session_id}
                )
            else:
                results = self._collection.query(
                    query_embedding,
                    min(top_k, 10),
                    {"session_id": session_id}
                )

            docs = []
            for i, doc in enumerate(results["documents"][0]):
                docs.append({
                    "content": doc,
                    "filename": results["metadatas"][0][i].get("filename", "unknown"),
                    "relevance": 1 - results["distances"][0][i],
                })
            return docs
        except Exception as e:
            print(f"RAG search error: {e}")
            return []

    def get_document_list(self, session_id: str = "default") -> list[str]:
        if not self._available: return []
        try:
            if self._engine == "chromadb":
                results = self._collection.get(where={"session_id": session_id})
                return list(set(m["filename"] for m in results["metadatas"] if m))
            else:
                return list(set(m["filename"] for m in self._collection.metadatas if m.get("session_id") == session_id))
        except: return []

document_store = DocumentStore()
