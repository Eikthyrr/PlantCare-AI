# PlantCare AI — Deteksi Kesehatan Tanaman & Penyakit Daun

Aplikasi web *full-stack* berbasis AI untuk mendeteksi kesehatan tanaman dan menganalisis penyakit daun dari foto secara instan. Didukung oleh **FastAPI** di backend dan integrasi **Google Gemini API (Vision)**.

## Fitur Utama
- **Nature-Themed UI/UX** — Desain antarmuka modern bernuansa alam dengan efek *glassmorphism* yang responsif (*mobile-friendly*).
- **Drag-and-Drop Area** — Unggah gambar daun dengan mudah menggunakan fitur seret & lepas atau melalui tombol file galeri.
- **Pratinjau Gambar** — Menampilkan pratinjau foto sebelum proses analisis dimulai.
- **Skeleton & Spinner Loading** — Animasi pemrosesan data untuk kenyamanan pengalaman pengguna.
- **Laporan AI Terstruktur** — Menghasilkan diagnosis lengkap:
  - **Status:** Sehat / Terindikasi Penyakit.
  - **Nama Penyakit:** Jenis penyakit yang terdeteksi.
  - **Deskripsi:** Detail penjelasan mengenai kondisi tanaman.
  - **Rekomendasi:** Langkah konkret penanganan dan perawatan.

---

## Tech Stack
- **Frontend:** HTML5, CSS3 (Vanilla CSS), Vanilla JavaScript.
- **Backend:** Python (FastAPI framework).
- **AI Engine:** Google Gemini API (model `gemini-2.5-flash`).
- **Deployment:** Vercel (All-in-One: Frontend & Serverless Backend).

---

## Cara Menjalankan Secara Lokal (Local Development)

### 1. Prasyarat
- Python 3.9 ke atas instalasi di komputer Anda.
- API Key Google Gemini (Dapatkan gratis di [Google AI Studio](https://aistudio.google.com/)).

### 2. Setup Backend
1. Masuk ke folder backend:
   ```bash
   cd backend
   ```
2. Buat dan aktifkan *Virtual Environment*:
   ```bash
   python -m venv venv
   # Di Windows (PowerShell):
   venv\Scripts\activate
   # Di macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependensi:
   ```bash
   pip install -r requirements.txt
   ```
4. Salin `.env.example` menjadi `.env` lalu masukkan API Key Anda:
   ```bash
   copy .env.example .env
   # Edit file .env dan isi: GEMINI_API_KEY=KUNCI_API_ANDA
   ```
5. Jalankan server lokal:
   ```bash
   uvicorn main:app --reload
   ```
   *Backend akan berjalan di: `http://localhost:8000`*

### 3. Setup Frontend
Buka file `frontend/index.html` langsung di browser Anda (atau gunakan ekstensi Live Server di VS Code).

---

## Kontribusi
Jika Anda ingin berkontribusi atau mengembangkan fitur lebih lanjut, silakan lakukan *Fork* repository ini dan kirimkan *Pull Request*.

**PlantCare AI** — *Dibuat untuk kelestarian tanaman Anda.*
