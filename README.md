# 🌌 AI-Orbit - Intelligence System

AI-Orbit adalah platform asisten kecerdasan buatan (AI) generasi berikutnya yang dirancang dengan estetika premium dan fitur mutakhir. Platform ini menggabungkan berbagai model AI terbaik di dunia ke dalam satu antarmuka yang elegan dan responsif.


## ✨ Fitur Unggulan

- **🧠 Orbit Brain (Intelligent Routing)**: Secara otomatis memilih model AI terbaik (Qwen, Kimi, Llama, atau GPT) berdasarkan karakteristik prompt Anda.
- **📁 Advanced RAG System**: Unggah dokumen (PDF, DOCX, TXT) dan biarkan AI menganalisis konteksnya untuk jawaban yang super akurat.
- **☁️ Cloud History Sync**: Sinkronisasi riwayat percakapan antar perangkat menggunakan database Supabase.
- **🔐 Secure Authentication**: Masuk dengan aman menggunakan Email atau Google OAuth.
- **🎨 Premium UI/UX**: Desain futuristik dengan efek Glassmorphism, Ambient Light, dan animasi halus menggunakan Framer Motion.
- **🎤 Voice Interaction**: Mengobrol langsung dengan AI menggunakan teknologi ElevenLabs.

## 🚀 Teknologi yang Digunakan

### Frontend
- **Next.js 15+** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Framer Motion** (Animations)
- **Zustand** (State Management)
- **Lucide React** (Icons)

### Backend
- **FastAPI** (Python)
- **LangGraph** (AI Orchestration)
- **ChromaDB** (Vector Database for RAG)
- **Supabase** (Auth & Persistence)
- **OpenAI & NVIDIA NIM** (AI Providers)

## 🛠️ Instalasi Lokal

### 1. Kloning Repositori
```bash
git clone https://github.com/username/ai-orbit.git
cd ai-orbit
```

### 2. Setup Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # atau `venv\Scripts\activate` di Windows
pip install -r requirements.txt
```
*Pastikan file `.env` sudah dikonfigurasi dengan API Key yang diperlukan.*

### 3. Setup Frontend
```bash
cd ../frontend
npm install
npm run dev
```

## 🌐 Konfigurasi Supabase
Gunakan skema yang tersedia di `supabase_schema.sql` untuk menyiapkan tabel `conversations` dan `messages` di dashboard Supabase Anda.

## 📄 Lisensi
Proyek ini dilisensikan di bawah [MIT License](LICENSE).

---
*Developed with ❤️ by HRNT (Hernata Ramadhan)*
