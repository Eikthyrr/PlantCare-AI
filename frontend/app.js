/**
 * ============================================
 * PlantCare AI — Frontend Application Logic
 * ============================================
 * Menangani upload gambar (drag-and-drop + file picker),
 * preview gambar, panggilan API ke backend, dan
 * rendering hasil analisis dari Gemini AI.
 * 
 * Mendukung dua mode analisis:
 * 1. Penyakit Daun (leaf)
 * 2. Kematangan Buah (fruit)
 * ============================================
 */

// ==========================================
// Konfigurasi
// ==========================================
const CONFIG = {
    // URL endpoint backend FastAPI (relatif untuk mendukung All-in-One deployment)
    API_URL: '/api/analyze',
    // Batas ukuran file: 10MB
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    // Tipe file yang diterima
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    // Durasi toast notification (ms)
    TOAST_DURATION: 4000,
};

// ==========================================
// DOM Elements
// ==========================================
const $ = (sel) => document.querySelector(sel);

const DOM = {
    navbar:          $('#navbar'),
    dropzone:        $('#upload-dropzone'),
    dropzoneContent: $('#dropzone-content'),
    fileInput:       $('#file-input'),
    previewContainer:$('#preview-container'),
    previewImage:    $('#preview-image'),
    previewFilename: $('#preview-filename'),
    previewRemove:   $('#preview-remove'),
    analyzeBtn:      $('#analyze-btn'),
    analyzeBtnText:  $('.analyze-btn-text'),
    analyzeBtnLoading: $('.analyze-btn-loading'),
    resultPanel:     $('#result-panel'),
    resultBadge:     $('#result-badge'),
    resultStatus:    $('#result-status'),
    resultStatusCard:$('#result-status-card'),
    resultStatusIcon:$('#result-status-icon'),
    resultDisease:   $('#result-disease'),
    resultDiseaseCard:$('#result-disease-card'),
    resultDiseaseIcon:$('#result-disease-icon'),
    resultDiseaseLabel:$('#result-disease-label'),
    resultDescription:$('#result-description'),
    resultRecommendation: $('#result-recommendation'),
    skeletonPanel:   $('#skeleton-panel'),
    resetBtn:        $('#reset-btn'),
    toastContainer:  $('#toast-container'),
    // Mode tabs
    modeTabs:        $('#mode-tabs'),
    tabLeaf:         $('#tab-leaf'),
    tabFruit:        $('#tab-fruit'),
};

// ==========================================
// State Aplikasi
// ==========================================
let selectedFile = null;        // File gambar yang dipilih user
let isAnalyzing = false;        // Flag untuk mencegah double-submit
let currentMode = 'leaf';       // Mode analisis aktif: 'leaf' atau 'fruit'

// ==========================================
// Inisialisasi Event Listeners
// ==========================================
function init() {
    // --- Navbar scroll effect ---
    window.addEventListener('scroll', handleNavbarScroll);

    // --- Drag and Drop ---
    DOM.dropzone.addEventListener('dragenter', handleDragEnter);
    DOM.dropzone.addEventListener('dragover', handleDragOver);
    DOM.dropzone.addEventListener('dragleave', handleDragLeave);
    DOM.dropzone.addEventListener('drop', handleDrop);

    // --- Klik area dropzone (selain tombol) membuka file picker ---
    DOM.dropzone.addEventListener('click', (e) => {
        // Jangan buka file picker jika:
        // - klik pada tombol remove
        // - sudah ada file terpilih
        // - klik berasal dari label (yang sudah membuka file picker secara native)
        // - klik berasal dari input file itu sendiri
        if (
            e.target.closest('.preview-remove') ||
            e.target.closest('label') ||
            e.target === DOM.fileInput ||
            selectedFile
        ) return;
        DOM.fileInput.click();
    });

    // --- File input change ---
    DOM.fileInput.addEventListener('change', handleFileSelect);

    // --- Tombol hapus preview ---
    DOM.previewRemove.addEventListener('click', (e) => {
        e.stopPropagation();
        clearSelectedFile();
    });

    // --- Tombol Analisis ---
    DOM.analyzeBtn.addEventListener('click', handleAnalyze);

    // --- Tombol Reset (analisis ulang) ---
    DOM.resetBtn.addEventListener('click', handleReset);

    // --- Mode Tabs (Penyakit Daun / Kematangan Buah) ---
    DOM.modeTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.mode-tab');
        if (!tab || tab.classList.contains('active')) return;
        switchMode(tab.dataset.mode);
    });

    // --- Scroll animations (Intersection Observer) ---
    setupScrollAnimations();
}

// ==========================================
// Mode Switching (Leaf / Fruit)
// ==========================================
function switchMode(mode) {
    currentMode = mode;

    // Update active tab visual
    document.querySelectorAll('.mode-tab').forEach(tab => tab.classList.remove('active'));
    if (mode === 'fruit') {
        DOM.tabFruit.classList.add('active');
    } else {
        DOM.tabLeaf.classList.add('active');
    }

    // Sembunyikan hasil sebelumnya saat ganti mode
    DOM.resultPanel.style.display = 'none';
    DOM.skeletonPanel.style.display = 'none';
}

// ==========================================
// Navbar Scroll Effect
// ==========================================
function handleNavbarScroll() {
    // Tambahkan class 'scrolled' saat user scroll ke bawah
    if (window.scrollY > 20) {
        DOM.navbar.classList.add('scrolled');
    } else {
        DOM.navbar.classList.remove('scrolled');
    }
}

// ==========================================
// Drag & Drop Handlers
// ==========================================
function handleDragEnter(e) {
    e.preventDefault();
    if (!selectedFile) {
        DOM.dropzone.classList.add('drag-over');
    }
}

function handleDragOver(e) {
    e.preventDefault(); // Wajib agar drop bisa terjadi
}

function handleDragLeave(e) {
    e.preventDefault();
    // Hanya hapus class jika mouse keluar dari dropzone (bukan child element)
    if (!DOM.dropzone.contains(e.relatedTarget)) {
        DOM.dropzone.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    DOM.dropzone.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

// ==========================================
// File Selection Handler
// ==========================================
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

// ==========================================
// Validasi & Proses File
// ==========================================
function processFile(file) {
    // Validasi tipe file
    if (!CONFIG.ALLOWED_TYPES.includes(file.type)) {
        showToast('Format file tidak didukung. Gunakan JPG, PNG, atau WebP.', 'error');
        return;
    }

    // Validasi ukuran file
    if (file.size > CONFIG.MAX_FILE_SIZE) {
        showToast('Ukuran file terlalu besar. Maksimal 10MB.', 'error');
        return;
    }

    selectedFile = file;

    // Tampilkan preview gambar menggunakan FileReader
    const reader = new FileReader();
    reader.onload = (e) => {
        DOM.previewImage.src = e.target.result;
        DOM.previewFilename.textContent = file.name;
        DOM.dropzoneContent.style.display = 'none';
        DOM.previewContainer.style.display = 'block';
        DOM.dropzone.classList.add('has-file');
    };
    reader.readAsDataURL(file);

    // Aktifkan tombol analisis
    DOM.analyzeBtn.disabled = false;

    // Sembunyikan hasil sebelumnya (jika ada)
    DOM.resultPanel.style.display = 'none';
    DOM.skeletonPanel.style.display = 'none';
}

// ==========================================
// Hapus File yang Dipilih
// ==========================================
function clearSelectedFile() {
    selectedFile = null;
    DOM.fileInput.value = '';
    DOM.previewContainer.style.display = 'none';
    DOM.dropzoneContent.style.display = 'block';
    DOM.dropzone.classList.remove('has-file');
    DOM.analyzeBtn.disabled = true;
    DOM.previewImage.src = '';
}

// ==========================================
// Analisis Gambar (Kirim ke Backend)
// ==========================================
async function handleAnalyze() {
    if (!selectedFile || isAnalyzing) return;

    isAnalyzing = true;

    // Tampilkan state loading pada tombol
    DOM.analyzeBtnText.style.display = 'none';
    DOM.analyzeBtnLoading.style.display = 'inline-flex';
    DOM.analyzeBtn.disabled = true;

    // Tampilkan skeleton loading panel
    DOM.resultPanel.style.display = 'none';
    DOM.skeletonPanel.style.display = 'block';

    // Scroll ke skeleton panel agar user melihat progress
    DOM.skeletonPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });

    try {
        // Kirim gambar + mode sebagai multipart/form-data ke backend
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('mode', currentMode); // Kirim mode analisis (leaf/fruit)

        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Server error: ${response.status}`);
        }

        const data = await response.json();
        displayResults(data);
        showToast('Analisis selesai!', 'success');

    } catch (error) {
        console.error('Analysis error:', error);

        // Tampilkan pesan error yang user-friendly
        let message = 'Terjadi kesalahan saat menganalisis gambar.';
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            message = 'Tidak dapat terhubung ke server. Pastikan backend sudah berjalan.';
        } else if (error.message) {
            message = error.message;
        }
        showToast(message, 'error');
        DOM.skeletonPanel.style.display = 'none';

    } finally {
        // Kembalikan state tombol ke semula
        isAnalyzing = false;
        DOM.analyzeBtnText.style.display = 'inline-flex';
        DOM.analyzeBtnLoading.style.display = 'none';
        DOM.analyzeBtn.disabled = false;
    }
}

// ==========================================
// Tampilkan Hasil Analisis
// ==========================================
function displayResults(data) {
    // Sembunyikan skeleton, tampilkan panel hasil
    DOM.skeletonPanel.style.display = 'none';
    DOM.resultPanel.style.display = 'block';

    if (currentMode === 'fruit') {
        // ---- MODE: Kematangan Buah ----
        displayFruitResults(data);
    } else {
        // ---- MODE: Penyakit Daun (default) ----
        displayLeafResults(data);
    }

    // Scroll ke panel hasil
    DOM.resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Menampilkan hasil analisis untuk mode Penyakit Daun
 */
function displayLeafResults(data) {
    const isHealthy = data.status && data.status.toLowerCase().includes('sehat');

    // Badge status
    DOM.resultBadge.textContent = isHealthy ? '✅ Sehat' : '⚠️ Terindikasi Penyakit';
    DOM.resultBadge.className = `result-badge ${isHealthy ? 'healthy' : 'diseased'}`;

    // Status card
    DOM.resultStatus.textContent = data.status || 'Tidak diketahui';
    DOM.resultStatusIcon.textContent = isHealthy ? '🌿' : '🍂';
    DOM.resultStatusCard.className = `result-item ${isHealthy ? 'status-healthy' : 'status-diseased'}`;

    // Label & icon untuk penyakit daun
    DOM.resultDiseaseLabel.textContent = 'Nama Penyakit';
    DOM.resultDiseaseIcon.textContent = '🦠';
    DOM.resultDisease.textContent = data.disease_name || (isHealthy ? 'Tidak ada' : 'Tidak teridentifikasi');

    // Deskripsi & Rekomendasi
    DOM.resultDescription.textContent = data.description || 'Tidak ada deskripsi tersedia.';
    DOM.resultRecommendation.textContent = data.recommendation || 'Tidak ada rekomendasi tersedia.';
}

/**
 * Menampilkan hasil analisis untuk mode Kematangan Buah
 */
function displayFruitResults(data) {
    const statusLower = (data.status || '').toLowerCase();

    // Tentukan tingkat kematangan untuk styling
    let badgeClass, badgeText, statusIcon, statusClass;

    if (statusLower.includes('matang') && statusLower.includes('terlalu')) {
        badgeClass = 'overripe';
        badgeText = '🟤 Terlalu Matang';
        statusIcon = '🍌';
        statusClass = 'status-overripe';
    } else if (statusLower.includes('matang') && !statusLower.includes('setengah')) {
        badgeClass = 'ripe';
        badgeText = '🟢 Matang';
        statusIcon = '🍎';
        statusClass = 'status-ripe';
    } else if (statusLower.includes('setengah')) {
        badgeClass = 'half-ripe';
        badgeText = '🟡 Setengah Matang';
        statusIcon = '🍊';
        statusClass = 'status-half-ripe';
    } else if (statusLower.includes('mentah')) {
        badgeClass = 'unripe';
        badgeText = '⚪ Mentah';
        statusIcon = '🥝';
        statusClass = 'status-unripe';
    } else {
        badgeClass = 'diseased';
        badgeText = '❓ ' + data.status;
        statusIcon = '❓';
        statusClass = '';
    }

    // Badge status
    DOM.resultBadge.textContent = badgeText;
    DOM.resultBadge.className = `result-badge ${badgeClass}`;

    // Status card
    DOM.resultStatus.textContent = data.status || 'Tidak diketahui';
    DOM.resultStatusIcon.textContent = statusIcon;
    DOM.resultStatusCard.className = `result-item ${statusClass}`;

    // Label & icon untuk jenis buah (menggunakan field disease_name untuk nama buah)
    DOM.resultDiseaseLabel.textContent = 'Jenis Buah';
    DOM.resultDiseaseIcon.textContent = '🍇';
    DOM.resultDisease.textContent = data.disease_name || 'Tidak teridentifikasi';

    // Deskripsi & Rekomendasi
    DOM.resultDescription.textContent = data.description || 'Tidak ada deskripsi tersedia.';
    DOM.resultRecommendation.textContent = data.recommendation || 'Tidak ada rekomendasi tersedia.';
}

// ==========================================
// Reset — Analisis Gambar Lain
// ==========================================
function handleReset() {
    clearSelectedFile();
    DOM.resultPanel.style.display = 'none';
    DOM.skeletonPanel.style.display = 'none';

    // Scroll kembali ke area upload
    DOM.dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ==========================================
// Toast Notification
// ==========================================
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}</span>
        <span>${message}</span>
    `;

    DOM.toastContainer.appendChild(toast);

    // Auto-dismiss setelah durasi tertentu
    setTimeout(() => {
        toast.classList.add('toast-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, CONFIG.TOAST_DURATION);
}

// ==========================================
// Scroll Animations (Intersection Observer)
// ==========================================
function setupScrollAnimations() {
    // Elemen-elemen yang akan di-animasikan saat masuk viewport
    const targets = document.querySelectorAll(
        '.feature-card, .step-card, .section-header, .mode-tab'
    );

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target); // Animasi sekali saja
                }
            });
        },
        { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    targets.forEach((el) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(24px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(el);
    });
}

// ==========================================
// Jalankan saat DOM siap
// ==========================================
document.addEventListener('DOMContentLoaded', init);
