# PlantCare AI — Deteksi Kesehatan Tanaman & Kematangan Buah

Aplikasi web *full-stack* berbasis AI untuk mendeteksi kesehatan tanaman, menganalisis penyakit daun, serta mengecek tingkat kematangan buah dari foto secara instan. Didukung oleh **FastAPI** di backend dan integrasi **Google Gemini API (Vision)**.

## Fitur Utama
- **Dual Mode Analisis** — Pilih antara mode **Penyakit Daun** atau **Kematangan Buah**.
- **Nature-Themed UI/UX** — Desain antarmuka modern bernuansa alam dengan efek *glassmorphism* yang responsif (*mobile-friendly*).
- **Drag-and-Drop Area** — Unggah gambar daun/buah dengan mudah menggunakan fitur seret & lepas atau melalui tombol file galeri.
- **Pratinjau Gambar** — Menampilkan pratinjau foto sebelum proses analisis dimulai.
- **Skeleton & Spinner Loading** — Animasi pemrosesan data untuk kenyamanan pengalaman pengguna.
- **Laporan AI Terstruktur** — Menghasilkan diagnosis lengkap:
  - **Status:** Sehat/Sakit (Penyakit Daun) atau Mentah/Matang/dll (Kematangan Buah).
  - **Identifikasi:** Nama Penyakit atau Jenis Buah yang terdeteksi.
  - **Deskripsi:** Detail penjelasan mengenai kondisi fisik daun/buah.
  - **Rekomendasi:** Langkah perawatan, penyimpanan, atau kapan waktu yang tepat untuk konsumsi.

---

## Tech Stack
- **Frontend:** HTML5, CSS3 (Vanilla CSS), Vanilla JavaScript.
- **Backend:** Python (FastAPI framework).
- **AI Engine:** Google Gemini API (model `gemini-2.5-flash`).
- **Deployment:** Vercel.

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
