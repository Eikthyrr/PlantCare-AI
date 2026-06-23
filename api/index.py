"""
============================================
PlantCare AI — Serverless Backend API (Vercel)
============================================
"""

import os
import json
from typing import Optional
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
GEMINI_MODEL = "gemini-2.5-flash"

# Inisialisasi Klien Gemini jika API Key tersedia
client = None
if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)

ANALYSIS_PROMPT = """Kamu adalah seorang pakar agronomis dan fitopatologis yang sangat berpengalaman.
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

class AnalysisResponse(BaseModel):
    status: str
    disease_name: Optional[str] = ""
    description: str
    recommendation: str

app = FastAPI(
    title="PlantCare AI API",
    description="Serverless API untuk mendeteksi penyakit tanaman",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api")
async def root():
    return {
        "app": "PlantCare AI Serverless",
        "status": "running",
        "key_configured": GEMINI_API_KEY is not None
    }

@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_plant(file: UploadFile = File(...)):
    if not GEMINI_API_KEY:
         raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY belum diatur pada Environment Variables Vercel!"
        )
    
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Format file '{file.content_type}' tidak didukung. Gunakan JPG, PNG, atau WebP."
        )
    
    file_content = await file.read()
    
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Ukuran file terlalu besar. Maksimal 10MB."
        )
    
    try:
        global client
        if client is None:
            client = genai.Client(api_key=GEMINI_API_KEY)

        image_part = types.Part.from_bytes(
            data=file_content,
            mime_type=file.content_type,
        )
        
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                ANALYSIS_PROMPT,
                image_part,
            ],
        )
        
        response_text = response.text.strip()
        
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1])
        
        result = json.loads(response_text)
        
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
