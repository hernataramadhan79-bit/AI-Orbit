"""
Supabase Storage Manager — AI Orbit
Mengelola upload dan retrieval file ke/dari Supabase Storage bucket.
Berlaku sebagai pengganti folder lokal 'uploads/' agar data persisten saat deploy.
"""
import os
import uuid
import mimetypes
from typing import Optional


class SupabaseStorageManager:
    """
    Upload file ke Supabase Storage dan kembalikan public URL.
    Bucket: 'orbit-uploads' (harus dibuat dengan policy public read).
    """

    BUCKET_NAME = "orbit-uploads"

    def __init__(self, supabase_url: str, supabase_key: str):
        self._available = False
        self._client = None

        if not supabase_url or not supabase_key:
            print("⚠️  Supabase Storage: URL atau Key kosong, storage cloud dinonaktifkan.")
            return

        try:
            from supabase import create_client, Client
            self._client: Client = create_client(supabase_url, supabase_key)
            self._ensure_bucket()
            self._available = True
            print(f"✅ Supabase Storage aktif (bucket: '{self.BUCKET_NAME}')")
        except Exception as e:
            print(f"⚠️  Supabase Storage gagal diinisialisasi: {e}")

    def _ensure_bucket(self):
        """Pastikan bucket sudah ada, jika belum buat secara otomatis."""
        try:
            existing = self._client.storage.list_buckets()
            names = [b.name for b in existing]
            if self.BUCKET_NAME not in names:
                self._client.storage.create_bucket(
                    self.BUCKET_NAME,
                    options={"public": True, "file_size_limit": 52428800}  # 50 MB limit
                )
                print(f"✅ Bucket '{self.BUCKET_NAME}' berhasil dibuat.")
        except Exception as e:
            print(f"⚠️  Gagal memastikan bucket: {e}")

    @property
    def available(self) -> bool:
        return self._available

    async def upload(
        self,
        file_bytes: bytes,
        original_filename: str,
        session_id: str = "default",
        content_type: Optional[str] = None,
    ) -> dict:
        """
        Upload file ke Supabase Storage.

        Returns:
            {
                "url": "<public_url>",
                "path": "<storage_path>",
                "filename": "<original_name>",
                "provider": "supabase" | "local"
            }
        """
        if not self._available:
            raise RuntimeError("Supabase Storage tidak tersedia.")

        ext = os.path.splitext(original_filename)[1] or ""
        unique_name = f"{uuid.uuid4().hex}{ext}"
        storage_path = f"{session_id}/{unique_name}"

        if not content_type:
            content_type, _ = mimetypes.guess_type(original_filename)
            content_type = content_type or "application/octet-stream"

        import asyncio
        loop = asyncio.get_event_loop()

        def _do_upload():
            return self._client.storage.from_(self.BUCKET_NAME).upload(
                path=storage_path,
                file=file_bytes,
                file_options={"content-type": content_type, "upsert": "false"},
            )

        await loop.run_in_executor(None, _do_upload)

        # Build public URL
        public_url = (
            f"{self._client.supabase_url}/storage/v1/object/public"
            f"/{self.BUCKET_NAME}/{storage_path}"
        )

        return {
            "url": public_url,
            "path": storage_path,
            "filename": original_filename,
            "provider": "supabase",
        }

    def get_public_url(self, path: str) -> str:
        """Kembalikan public URL untuk path yang sudah ada."""
        return (
            f"{self._client.supabase_url}/storage/v1/object/public"
            f"/{self.BUCKET_NAME}/{path}"
        )

    async def delete(self, path: str) -> bool:
        """Hapus file dari storage."""
        if not self._available:
            return False
        try:
            import asyncio
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: self._client.storage.from_(self.BUCKET_NAME).remove([path])
            )
            return True
        except Exception as e:
            print(f"⚠️  Gagal menghapus file dari storage: {e}")
            return False


# ─────────────────────────────────────────────────────────────────────────────
# Lazy Singleton — diinisialisasi saat pertama kali diakses
# ─────────────────────────────────────────────────────────────────────────────
_storage_manager: Optional[SupabaseStorageManager] = None


def get_storage_manager() -> SupabaseStorageManager:
    global _storage_manager
    if _storage_manager is None:
        from app.core.config import settings
        _storage_manager = SupabaseStorageManager(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_KEY,
        )
    return _storage_manager
