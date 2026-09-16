# RekeningKoran to Excel (.xlsx) Converter & Cleaner 🏦📊

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![Python: 3.10+](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688.svg)](https://fastapi.tiangolo.com/)
[![React: 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Tailwind CSS: 4](https://img.shields.io/badge/Tailwind-4.0-38bdf8.svg)](https://tailwindcss.com/)

Aplikasi web modern (SaaS-ready) yang dirancang khusus untuk mengubah dokumen PDF **Rekening Koran (Bank Statement)** dari berbagai bank di Indonesia menjadi file **Excel (.xlsx)** yang rapi, bersih, dan berformat numerik akurat.

Dilengkapi dengan algoritma **Smart Multi-Line Stitching** untuk menggabungkan catatan transaksi yang terpotong, normalisasi format angka mata uang Indonesia (IDR), dan kebijakan privasi **Zero-Disk Retention** (semua pemrosesan terjadi di memori RAM).

---

## 🌟 Fitur Utama

- **Smart Statement Parser**: Deteksi otomatis komponen perbankan:
  - Tanggal Transaksi (`DD/MM`, `DD/MM/YYYY`, `DD-MMM-YYYY`)
  - Keterangan / Deskripsi Transaksi (termasuk multi-line description yang terpotong)
  - Mutasi Debit (Pengeluaran)
  - Mutasi Kredit (Pemasukan)
  - Saldo Akhir Berjalan
- **Data Cleaning & Sanitization (Pandas Engine)**:
  - Membersihkan header berulang dan footer halaman PDF
  - Menggabungkan baris keterangan multi-baris secara rapi
  - Menstandarkan format mata uang Indonesia (`1.250.000,00` -> float numerik `1250000.0`)
- **Excel (.xlsx) Sejati (openpyxl)**:
  - Nilai Debit, Kredit, dan Saldo diformat sebagai angka numerik (`#,##0.00`) sehingga formula `=SUM()` di Excel / Google Sheets langsung aktif
  - Auto-adjusted column width & styling korporat
- **Audit Rekonsiliasi Kas**:
  - Validasi matematis kontinuitas saldo: `Saldo Awal + Total Kredit - Total Debit == Saldo Akhir`
- **Keamanan & Privasi Data Perbankan (Zero-Disk Retention)**:
  - Menggunakan `io.BytesIO` di memori RAM. File PDF dan data nasabah **tidak pernah disimpan ke hard drive atau database**.

---

## 🏛️ Matriks Kompatibilitas Bank

| Bank | Template / Format | Karakteristik Parser |
| :--- | :--- | :--- |
| **BCA** | e-Statement KlikBCA / myBCA | Penanda CR (Kredit) & DB (Debit), transfer multi-baris |
| **Bank Mandiri** | Livin / MCM (Kopra) | Kolom Debit & Kredit terpisah, deskripsi merchant |
| **BNI** | BNI Mobile / BNI Direct | Format tanggal DD-MM-YYYY, catatan transfer kliring |
| **BRI** | BritAma / Simpedes / BRImo | Sandi transaksi, kode cabang, dan saldo berjalan |
| **Auto-Detect** | Universal Indonesian Statement | Heuristic regex parser untuk bank nasional lainnya |

---

## 📁 Struktur Direktori Proyek

```text
rekeningkoran-to-excel/
├── backend/                        # Backend Service (Python)
│   ├── main.py                     # Server FastAPI & API Endpoints
│   ├── statement_processor.py      # Core Parser (pdfplumber + pandas + openpyxl)
│   ├── requirements.txt            # Python Dependencies
│   └── Dockerfile                  # Container definition dengan Tesseract OCR & Poppler
├── src/                            # Frontend Service (React + Tailwind CSS)
│   ├── components/                 # UI Components (Header, UploadArea, StatementPreview)
│   ├── data/                       # Bank presets, sample statements & code snippets
│   ├── utils/                      # Client-side in-memory parser & Excel exporter
│   ├── App.tsx                     # Main Application Controller
│   ├── main.tsx                    # React DOM Root
│   └── types.ts                    # TypeScript Interfaces
├── docker-compose.yml              # Multi-container orchestration
├── Dockerfile.frontend             # Frontend production container
├── package.json                    # Node dependencies & scripts
└── README.md                       # Dokumentasi Proyek
```

---

## 🚀 Panduan Memulai Cepat (Quickstart)

### Opsi 1: Menggunakan Docker Compose (Direkomendasikan)

Jalankan seluruh sistem (Frontend + Backend) hanya dengan satu perintah:

```bash
docker-compose up --build
```
Akses aplikasi di browser:
- Frontend: `http://localhost:3000`
- Backend Swagger API Docs: `http://localhost:8000/docs`

---

### Opsi 2: Menjalankan Secara Manual (Development Mode)

#### 1. Menjalankan Backend (Python FastAPI)

```bash
# Masuk ke direktori backend
cd backend

# Buat virtual environment
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependensi
pip install -r requirements.txt

# Jalankan server FastAPI
uvicorn main:app --reload --port 8000
```
Server backend berjalan di `http://localhost:8000`.

#### 2. Menjalankan Frontend (React + Vite)

Buka terminal baru di direktori root:

```bash
# Install paket Node.js
npm install

# Jalankan server Vite
npm run dev
```
Buka browser di `http://localhost:3000`.

---

## 🔌 Dokumentasi REST API

### 1. `POST /api/parse-statement`
Mengekstrak PDF rekening koran dan mengembalikan ringkasan serta preview data baris.
- **Request**: `multipart/form-data` dengan field `file` (PDF) dan query params `preview_rows=10`.
- **Response**:
```json
{
  "success": true,
  "filename": "rekening_koran_bca.pdf",
  "summary": {
    "bank_name": "BCA",
    "total_transactions": 25,
    "total_debit": 32685000.0,
    "total_kredit": 58500000.0,
    "net_cashflow": 25815000.0,
    "saldo_akhir": 71065000.0,
    "is_balanced": true
  },
  "preview": [
    {
      "tanggal": "01/08/2024",
      "keterangan": "TRSF E-BANKING CR / 0108/FTSCY/WS95011 / INVOICE 2024-0801",
      "cabang": "0950",
      "tipe": "CR",
      "mutasi_debit": 0.0,
      "mutasi_kredit": 25000000.0,
      "saldo": 70250000.0
    }
  ]
}
```

### 2. `POST /api/export-excel`
Memproses PDF rekening koran dan langsung mengirimkan streaming file binary `.xlsx` terformat rapi.

---

## 🔒 Kebijakan Keamanan & Privasi Data Perbankan

1. **In-Memory Streaming**: File PDF tidak pernah ditulis ke disk atau media penyimpanan fisik server (`io.BytesIO`). Data langsung dibersihkan oleh Garbage Collector Python setelah proses selesai.
2. **Tidak Ada Database**: Tidak ada penyimpanan nomor rekening atau catatan transaksi di basis data manapun.
3. **Standar TLS 1.3**: Seluruh komunikasi web dienkripsi penuh saat ditransmisikan.

---

## 📄 Lisensi
Didistribusikan di bawah lisensi MIT. Lihat file `LICENSE` untuk informasi lebih lanjut.
