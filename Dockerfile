# Gunakan Python image resmi yang ringan
FROM python:3.10-slim

# Set environment variables agar output log bersih
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Buat folder kerja
WORKDIR /app

# Instal dependensi sistem yang diperlukan untuk ChromaDB dan pengolahan gambar
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements dan instal dependensi Python
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy seluruh kode backend
COPY backend/ .

# Buat folder dummy untuk uploads dan data agar tidak error saat start
RUN mkdir -p uploads data

# Ekspos port (Hugging Face biasanya menggunakan port 7860 secara default)
EXPOSE 7860

# Jalankan server menggunakan uvicorn
# --timeout-keep-alive 120: penting agar SSE stream tidak di-drop di HuggingFace
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860", "--timeout-keep-alive", "120", "--log-level", "info"]
