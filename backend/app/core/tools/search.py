"""
Web Search Tool menggunakan Tavily API.
Digunakan oleh LangGraph agent untuk mencari informasi real-time dari internet.
"""
from typing import Optional

class WebSearchTool:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self._client = None
        self._available = False
        if api_key and api_key != "your-tavily-key-here":
            try:
                from tavily import TavilyClient
                self._client = TavilyClient(api_key=api_key)
                self._available = True
            except ImportError:
                print("WARNING: tavily-python tidak terinstall. Fitur pencarian web dinonaktifkan.")
            except Exception as e:
                print(f"WARNING: Gagal menginisialisasi Tavily: {e}")

    @property
    def available(self) -> bool:
        return self._available

    async def search(self, query: str, max_results: int = 5) -> dict:
        """Melakukan pencarian web dan mengembalikan hasil terstruktur."""
        if not self._available:
            return {"results": [], "error": "Web search tidak tersedia."}
        
        import asyncio
        try:
            # Tavily client sinkron, jalankan di executor agar tidak blocking
            loop = asyncio.get_event_loop()
            task = loop.run_in_executor(
                None,
                lambda: self._client.search(
                    query=query,
                    search_depth="advanced",
                    max_results=max_results,
                    include_answer=True,
                    include_raw_content=False,
                )
            )
            
            # Berikan timeout 12 detik agar tidak stuck selamanya
            response = await asyncio.wait_for(task, timeout=12.0)
            
            results = []
            for r in response.get("results", []):
                results.append({
                    "title": r.get("title", ""),
                    "url": r.get("url", ""),
                    "content": r.get("content", "")[:500],  # Batasi panjang
                    "score": r.get("score", 0),
                })
            
            return {
                "query": query,
                "answer": response.get("answer", ""),
                "results": results,
            }
        except Exception as e:
            return {"results": [], "error": str(e)}


# Fungsi helper untuk deteksi apakah query butuh pencarian web
SEARCH_TRIGGERS = [
    "terbaru", "sekarang", "hari ini", "minggu ini", "bulan ini",
    "berita", "harga", "kurs", "saham", "update", "terkini",
    "latest", "current", "today", "news", "price", "market",
    "2024", "2025", "2026", "cuaca", "weather",
]

def needs_web_search(prompt: str) -> bool:
    """Deteksi apakah pertanyaan membutuhkan pencarian web real-time."""
    lower = prompt.lower()
    return any(trigger in lower for trigger in SEARCH_TRIGGERS)
