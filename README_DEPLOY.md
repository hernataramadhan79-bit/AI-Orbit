# Panduan Deployment AI Orbit

Aplikasi AI Orbit terdiri dari dua bagian utama: **Backend (FastAPI)** dan **Frontend (Next.js)**. Berikut adalah langkah-langkah untuk mendeploy ke GitHub dan Hugging Face.

## 1. Persiapan GitHub

Sistem Git sudah terinisialisasi di folder ini. Lakukan langkah berikut untuk mengunggah kode Anda:

1.  Buat repository baru di [GitHub](https://github.com/new) dengan nama `ai-orbit`.
2.  Jalankan perintah berikut di terminal:
    ```bash
    git add .
    git commit -m "Initial commit: AI Orbit Fullstack"
    git branch -M main
    git remote add origin https://github.com/USERNAME_ANDA/ai-orbit.git
    git push -u origin main
    ```

## 2. Deployment ke Hugging Face (Backend)

Kita akan menggunakan **Docker Space** untuk API Backend agar mendukung semua fitur AI & Tools.

1.  Buka [Hugging Face Spaces](https://huggingface.co/new-space).
2.  Pilih nama (misal: `ai-orbit-api`).
3.  Pilih **Docker** sebagai SDK.
4.  Pilih **Blank** template.
5.  Setelah Space dibuat, unggah isi folder `backend/` ke Space tersebut.
6.  Buka **Settings** di Space Anda dan tambahkan **Variables/Secrets** berikut:
    *   `NVIDIA_API_KEY_GPT`
    *   `NVIDIA_API_KEY_LLAMA`
    *   `TAVILY_API_KEY`
    *   `SUPABASE_URL`
    *   `SUPABASE_KEY`

Space ini akan memberikan URL (misal: `https://username-ai-orbit-api.hf.space`). Catat URL ini.

## 3. Deployment ke Hugging Face (Frontend)

Untuk Frontend, kita akan menggunakan SDK **Docker**.

1.  Buat Space baru lagi (misal: `ai-orbit-web`).
2.  Pilih **Docker** SDK.
3.  Unggah isi folder `frontend/`.
4.  **PENTING**: Buat file `Dockerfile` di folder root frontend Space Anda:
    ```dockerfile
    FROM node:20-alpine AS builder
    WORKDIR /app
    COPY package*.json ./
    RUN npm install
    COPY . .
    # Ganti dengan URL Backend Anda dari langkah 2
    ENV NEXT_PUBLIC_API_URL=https://username-ai-orbit-api.hf.space
    RUN npm run build

    FROM node:20-alpine
    WORKDIR /app
    COPY --from=builder /app/.next ./.next
    COPY --from=builder /app/public ./public
    COPY --from=builder /app/package*.json ./
    RUN npm install --production
    EXPOSE 7860
    ENV PORT 7860
    CMD ["npm", "start"]
    ```

## 4. Keamanan & Konfigurasi
*   Jangan lupa untuk mengubah `SUPABASE_URL` dan `SUPABASE_KEY` di Settings HF agar data tersimpan di database Anda sendiri.
*   CORS di backend sudah diatur untuk mengizinkan akses dari domain luar.

---
*Selamat! AI Orbit Anda sekarang online.*
