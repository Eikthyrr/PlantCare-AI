"""
============================================
PlantCare AI — Backend API Server
============================================
Menggunakan FastAPI untuk menerima upload gambar,
mengirimnya ke Google Gemini API (model vision),
dan mengembalikan hasil analisis dalam format JSON.

Mendukung dua mode analisis:
1. Deteksi Penyakit Daun (mode=leaf)
2. Deteksi Kematangan Buah (mode=fruit)
============================================
"""

import os
import json
from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from google.genai import types

# --- Load environment variables dari file .env ---
load_dotenv()

# ==========================================
# Konfigurasi Aplikasi
# ==========================================
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY belum diatur! "
        "Salin file .env.example menjadi .env dan isi API key Anda."
    )

# Batas ukuran file upload: 10 MB
MAX_FILE_SIZE = 10 * 1024 * 1024

# Tipe MIME gambar yang diterima
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

# Model Gemini yang digunakan (versi vision)
GEMINI_MODEL = "gemini-2.5-flash"

# ==========================================
# Inisialisasi Klien Gemini
# ==========================================
client = genai.Client(api_key=GEMINI_API_KEY)

# ==========================================
# Prompt untuk mode Penyakit Daun
# ==========================================
LEAF_ANALYSIS_PROMPT = """Kamu adalah seorang pakar agronomis dan fitopatologis yang sangat berpengalaman.
Analisis gambar daun tanaman berikut ini dan berikan diagnosis kesehatan tanaman.

PENTING: Jawab HANYA dalam format JSON berikut (tanpa markdown, tanpa code block, hanya JSON murni):
{
    "status": "Sehat" atau "Terindikasi Penyakit",
    "disease_name": "Nama penyakit dalam bahasa Indonesia (jika ada, kosongkan string jika sehat)",
    "description": "Deskripsi singkat tentang kondisi tanaman atau penyakit yang terdeteksi (2-4 kalimat)",
    "recommendation": "Rekomendasi perawatan atau penanganan yang tepat (2-4 kalimat)"
}

Aturan:
1. Jika daun terlihat sehat tanpa tanda-tanda penyakit, set status ke "Sehat" dan disease_name ke string kosong.
2. Jika terdeteksi penyakit, berikan nama penyakit yang spesifik dan akurat.
3. Deskripsi harus informatif dan mudah dipahami oleh petani awam.
4. Rekomendasi harus praktis dan dapat diterapkan.
5. Jika gambar bukan daun/tanaman, tetap berikan respons JSON dengan status "Tidak Dapat Dianalisis" dan jelaskan di deskripsi.
"""

# ==========================================
# Prompt untuk mode Kematangan Buah
# ==========================================
FRUIT_ANALYSIS_PROMPT = """Kamu adalah seorang pakar agronomi dan pascapanen buah-buahan yang sangat berpengalaman.
Analisis gambar buah berikut ini dan tentukan tingkat kematangannya.

PENTING: Jawab HANYA dalam format JSON berikut (tanpa markdown, tanpa code block, hanya JSON murni):
{
    "status": "Mentah" atau "Setengah Matang" atau "Matang" atau "Terlalu Matang",
    "disease_name": "Nama jenis buah yang terdeteksi dalam bahasa Indonesia",
    "description": "Deskripsi singkat tentang tingkat kematangan buah berdasarkan warna, tekstur, dan ciri visual lainnya (2-4 kalimat)",
    "recommendation": "Rekomendasi kapan waktu terbaik untuk dikonsumsi, cara penyimpanan yang tepat, atau tips pematangan jika masih mentah (2-4 kalimat)"
}

Aturan:
1. Identifikasi jenis buah terlebih dahulu, lalu analisis tingkat kematangannya.
2. Status harus salah satu dari: "Mentah", "Setengah Matang", "Matang", atau "Terlalu Matang".
3. Deskripsi harus menjelaskan ciri visual yang menjadi dasar penilaian kematangan (warna kulit, bintik, tekstur, dll).
4. Rekomendasi harus praktis: kapan sebaiknya dikonsumsi, cara menyimpan agar tahan lama, atau cara mempercepat pematangan.
5. Jika gambar bukan buah, tetap berikan respons JSON dengan status "Tidak Dapat Dianalisis" dan jelaskan di deskripsi.
"""

# ==========================================
# Schema Respons API
# ==========================================
class AnalysisResponse(BaseModel):
    """Schema untuk respons hasil analisis (digunakan oleh kedua mode)."""
    status: str
    disease_name: Optional[str] = ""
    description: str
    recommendation: str

# ==========================================
# Inisialisasi FastAPI
# ==========================================
app = FastAPI(
    title="PlantCare AI API",
    description="API untuk mendeteksi penyakit tanaman dan kematangan buah menggunakan Google Gemini Vision",
    version="1.1.0",
)

# --- CORS Middleware ---
# Mengizinkan frontend (yang dijalankan secara terpisah) untuk mengakses API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Dalam produksi, ganti dengan domain spesifik
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# Health Check Endpoint
# ==========================================
@app.get("/")
async def root():
    """Endpoint root untuk memverifikasi bahwa server berjalan."""
    return {
        "app": "PlantCare AI",
        "status": "running",
        "version": "1.1.0",
        "modes": ["leaf", "fruit"]
    }

# ==========================================
# Endpoint Analisis Gambar
# ==========================================
@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_plant(
    file: UploadFile = File(...),
    mode: str = Form("leaf"),  # Mode analisis: "leaf" atau "fruit"
):
    """
    Menerima upload gambar dan mode analisis, mengirimnya ke Gemini Vision
    untuk dianalisis, lalu mengembalikan hasil diagnosis.
    
    - **file**: File gambar (JPG, PNG, atau WebP, maks. 10MB)
    - **mode**: "leaf" untuk penyakit daun, "fruit" untuk kematangan buah
    """
    
    # --- Validasi tipe file ---
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Format file '{file.content_type}' tidak didukung. "
                   f"Gunakan JPG, PNG, atau WebP."
        )
    
    # --- Baca konten file ---
    file_content = await file.read()
    
    # --- Validasi ukuran file ---
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Ukuran file terlalu besar. Maksimal 10MB."
        )
    
    # --- Pilih prompt berdasarkan mode ---
    if mode == "fruit":
        prompt = FRUIT_ANALYSIS_PROMPT
    else:
        prompt = LEAF_ANALYSIS_PROMPT
    
    # --- Kirim gambar ke Gemini untuk dianalisis ---
    try:
        # Buat objek Part dari bytes gambar
        image_part = types.Part.from_bytes(
            data=file_content,
            mime_type=file.content_type,
        )
        
        # Panggil Gemini API dengan prompt + gambar
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                prompt,
                image_part,
            ],
        )
        
        # Ambil teks respons dari Gemini
        response_text = response.text.strip()
        
        # --- Parse respons JSON dari Gemini ---
        # Bersihkan jika Gemini membungkus dalam code block
        if response_text.startswith("```"):
            # Hapus markdown code block (```json ... ```)
            lines = response_text.split("\n")
            # Buang baris pertama (```json) dan terakhir (```)
            response_text = "\n".join(lines[1:-1])
        
        result = json.loads(response_text)
        
        # Validasi bahwa semua field yang diperlukan ada
        required_fields = ["status", "description", "recommendation"]
        for field in required_fields:
            if field not in result:
                raise ValueError(f"Field '{field}' tidak ditemukan dalam respons AI.")
        
        return AnalysisResponse(
            status=result.get("status", "Tidak diketahui"),
            disease_name=result.get("disease_name", ""),
            description=result.get("description", ""),
            recommendation=result.get("recommendation", ""),
        )
    
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="Gagal memproses respons dari AI. Silakan coba lagi."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Terjadi kesalahan saat menganalisis gambar: {str(e)}"
        )
