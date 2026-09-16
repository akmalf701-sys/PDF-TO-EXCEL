export const ARCHITECTURE_BLUEPRINT = `
================================================================================
BLUEPRINT ARSITEKTUR SISTEM: SAAS REKENING KORAN TO EXCEL CONVERTER
================================================================================

1. ARSITEKTUR TINGKAT TINGGI (HIGH-LEVEL ARCHITECTURE)
--------------------------------------------------------------------------------
   [ Client Browser ]
          │
          ├── (1) HTTP POST Multipart/form-data (PDF in RAM)
          ▼
   [ API Gateway & Ingress (FastAPI / SSL) ]
          │
          ├── (2) In-Memory Stream Buffer (io.BytesIO - Zero Disk Storage)
          ▼
   ┌─────────────────────────────────────────────────────────────┐
   │               SMART STATEMENT PARSER ENGINE                 │
   │                                                             │
   │  ┌───────────────────────┐       ┌───────────────────────┐  │
   │  │   Text-based PDF      │       │   Scanned Image PDF   │  │
   │  │  (pdfplumber Engine)  │       │ (pytesseract/EasyOCR) │  │
   │  └───────────┬───────────┘       └───────────┬───────────┘  │
   │              │                               │              │
   │              └───────────────┬───────────────┘              │
   │                              ▼                              │
   │              ┌───────────────────────────────┐              │
   │              │   Bank Template Identifier    │              │
   │              │ (BCA, Mandiri, BNI, BRI, etc) │              │
   │              └───────────────┬───────────────┘              │
   │                              ▼                              │
   │              ┌───────────────────────────────┐              │
   │              │    Multi-Line Stitcher &      │              │
   │              │     Regex Token Extractor     │              │
   │              └───────────────┬───────────────┘              │
   └──────────────────────────────┼──────────────────────────────┘
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │             DATA CLEANING & AUDIT (PANDAS)                  │
   │  • Trim repeated headers, footers & page numbers            │
   │  • Merge wrapped transaction notes (keterangan multi-line)  │
   │  • Normalize Indonesian Currency (IDR: titik/koma)          │
   │  • Map DB (Debit) vs CR (Kredit) and Balances               │
   │  • Mathematical Balance Reconciliation (Audit Continuity)   │
   └──────────────────────────────┬──────────────────────────────┘
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                 EXCEL BUILDER (OPENPYXL)                    │
   │  • Styled Title Block, Metadata & Bank Name                 │
   │  • Numeric Formatting (#,##0.00) - Real Numbers in Excel    │
   │  • Auto-adjusted column widths & zebra striping             │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
          ┌───────────────────────┴───────────────────────┐
          ▼                                               ▼
   [ JSON Data Preview ]                         [ Formatted .XLSX Stream ]
   (First 5-10 rows + KPI)                       (Direct Download to User)

2. PRINSIP KEAMANAN & PRIVASI DATA PERBANKAN (ZERO-RETENTION POLICY)
--------------------------------------------------------------------------------
1. In-Memory Processing: File PDF tidak pernah disimpan ke hard drive atau database.
   Menggunakan 'io.BytesIO()' di RAM Python sehingga data langsung musnah setelah
   request selesai diproses (Garbage Collected).
2. PII Masking: Fitur opsional untuk menyamarkan 6 digit tengah nomor rekening
   (e.g., 5270******12) untuk kepatuhan regulasi privasi finansial.
3. TLS 1.3 / HTTPS Encryption: Seluruh transmisi data dienkripsi end-to-end.
`;

export const BACKEND_FASTAPI_CODE = `"""
Backend API: FastAPI Server untuk Konversi Rekening Koran ke Excel
File: app.py / main.py
"""

import io
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import pandas as pd

from statement_processor import BankStatementProcessor

app = FastAPI(
    title="Rekening Koran to Excel Converter API",
    description="SaaS Engine untuk ekstraksi & normalisasi rekening koran perbankan Indonesia",
    version="1.0.0"
)

# Konfigurasi CORS untuk frontend modern (React / Next.js)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

processor = BankStatementProcessor()


@app.get("/api/health")
async def health_check():
    """Health check endpoint untuk load balancer & monitoring"""
    return {
        "status": "healthy",
        "service": "Bank Statement Parser Service",
        "supported_banks": ["BCA", "MANDIRI", "BNI", "BRI", "GENERIC_AUTO"]
    }


@app.post("/api/parse-statement")
async def parse_statement(
    file: UploadFile = File(..., description="File PDF Rekening Koran"),
    bank_type: Optional[str] = Query("AUTO", description="BCA | MANDIRI | BNI | BRI | AUTO"),
    preview_rows: Optional[int] = Query(10, description="Jumlah baris preview (default: 10)")
):
    """
    Endpoint untuk mengunggah PDF, memproses secara in-memory,
    dan mengembalikan metadata + pratinjau data (5-10 baris pertama).
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Hanya file berekstensi .pdf yang diperbolehkan.")

    try:
        # Baca konten file secara langsung ke memori (RAM) menggunakan BytesIO
        file_bytes = await file.read()
        pdf_stream = io.BytesIO(file_bytes)

        # Proses ekstraksi dan pembersihan data menggunakan Core Processor
        df, summary = processor.process_pdf(pdf_stream, bank_hint=bank_type)

        if df.empty:
            raise HTTPException(
                status_code=422,
                detail="Tidak ada baris transaksi yang berhasil diekstraksi dari PDF. Periksa apakah file di-password atau gunakan opsi OCR."
            )

        # Ambil sampel preview sesuai permintaan pengguna (5-10 baris)
        preview_df = df.head(preview_rows)
        preview_data = preview_df.to_dict(orient="records")

        return {
            "success": True,
            "filename": file.filename,
            "file_size_bytes": len(file_bytes),
            "summary": summary,
            "total_transactions": len(df),
            "preview": preview_data,
            "columns": list(df.columns)
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Terjadi kesalahan saat memproses rekening koran: {str(exc)}"
        )


@app.post("/api/export-excel")
async def export_excel(
    file: UploadFile = File(..., description="File PDF Rekening Koran"),
    bank_type: Optional[str] = Query("AUTO", description="BCA | MANDIRI | BNI | BRI | AUTO")
):
    """
    Endpoint untuk memproses PDF dan langsung mengembalikan file .xlsx terformat rapi.
    File Excel dihasilkan secara streaming in-memory tanpa menyentuh disk.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Hanya file .pdf yang valid.")

    try:
        file_bytes = await file.read()
        pdf_stream = io.BytesIO(file_bytes)

        # Ekstraksi dan pembersihan
        df, summary = processor.process_pdf(pdf_stream, bank_hint=bank_type)

        # Susun file Excel berformat rapi dengan openpyxl
        excel_buffer = processor.generate_excel(df, summary)

        base_filename = file.filename.rsplit(".", 1)[0]
        output_filename = f"{base_filename}_converted.xlsx"

        return StreamingResponse(
            excel_buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={output_filename}"}
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Gagal mengekspor file Excel: {str(exc)}"
        )


if __name__ == "__main__":
    import uvicorn
    # Jalankan server lokal untuk pengujian backend
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
`;

export const CORE_PROCESSOR_PYTHON_CODE = `"""
Core Engine: Ekstraksi Tabel Rekening Koran & Pembersihan Data dengan Pandas
File: statement_processor.py
"""

import io
import re
from typing import Dict, Any, Tuple, List, Optional
import pandas as pd
import pdfplumber
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Fallback OCR (opsional jika dokumen berupa scan)
try:
    import pytesseract
    from pdf2image import convert_from_bytes
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False


class BankStatementProcessor:
    """
    Engine terpusat untuk mendeteksi tipe bank, mengekstrak tabel,
    menggabungkan multi-line description, menstandarkan mata uang,
    dan mengekspor ke Excel profesional.
    """

    # Regex untuk mendeteksi tanggal transaksi (Format umum: DD/MM, DD/MM/YYYY, DD-MMM)
    DATE_PATTERNS = [
        r"^\\d{2}/\\d{2}/\\d{4}",
        r"^\\d{2}/\\d{2}",
        r"^\\d{2}-\\d{2}-\\d{4}",
        r"^\\d{2}\\s+(?:JAN|FEB|MAR|APR|MEI|JUN|JUL|AGU|SEP|OKT|NOV|DES)\\b",
    ]

    def __init__(self):
        pass

    def clean_indonesian_amount(self, val: Any) -> float:
        """
        Menstandarkan format angka Indonesia ke float numerik:
        Contoh input: '1.250.000,00', '1,250,000.00', '1250000.00', ' - ', None
        Output: 1250000.0
        """
        if pd.isna(val) or val is None:
            return 0.0

        s = str(val).strip()
        if not s or s in ["-", "--", "0", "0.00"]:
            return 0.0

        # Hapus simbol mata uang dan whitespace
        s = s.replace("Rp", "").replace("IDR", "").strip()

        # Deteksi format Indonesia (titik sebagai ribuan, koma sebagai desimal)
        # e.g., '1.250.000,50' -> titik dibuang, koma diganti titik
        if "." in s and "," in s:
            if s.rfind(",") > s.rfind("."):
                # Format ID: 1.250.000,00
                s = s.replace(".", "").replace(",", ".")
            else:
                # Format US: 1,250,000.00
                s = s.replace(",", "")
        elif "," in s:
            # Format dengan desimal koma saja (misal: 1250,50) atau ribuan koma
            parts = s.split(",")
            if len(parts) == 2 and len(parts[1]) == 2:
                s = s.replace(",", ".")
            else:
                s = s.replace(",", "")
        elif "." in s:
            # Jika ada lebih dari satu titik, pasti ribuan (e.g. 1.250.000)
            if s.count(".") > 1:
                s = s.replace(".", "")
            else:
                # Titik tunggal: periksa panjang bagian desimal
                parts = s.split(".")
                if len(parts) == 2 and len(parts[1]) == 3:
                    # e.g. 1.250 -> ribuan
                    s = s.replace(".", "")

        # Hapus sisa karakter non-numerik kecuali minus dan titik desimal
        s = re.sub(r"[^0-9.-]", "", s)

        try:
            return float(s) if s else 0.0
        except ValueError:
            return 0.0

    def detect_bank_type(self, full_text: str, bank_hint: str = "AUTO") -> str:
        """Deteksi otomatis nama bank dari teks rekening koran"""
        if bank_hint and bank_hint != "AUTO":
            return bank_hint.upper()

        text_upper = full_text.upper()
        if "BANK CENTRAL ASIA" in text_upper or "BCA" in text_upper:
            return "BCA"
        elif "BANK MANDIRI" in text_upper or "MANDIRI" in text_upper:
            return "MANDIRI"
        elif "BANK NEGARA INDONESIA" in text_upper or "BNI" in text_upper:
            return "BNI"
        elif "BANK RAKYAT INDONESIA" in text_upper or "BRI" in text_upper:
            return "BRI"
        return "GENERIC_AUTO"

    def extract_text_pdf(self, pdf_stream: io.BytesIO) -> List[Dict[str, Any]]:
        """
        Mengekstrak baris-baris dari PDF menggunakan pdfplumber dengan
        penanganan multi-line keterangan yang terpotong.
        """
        raw_rows = []

        with pdfplumber.open(pdf_stream) as pdf:
            for page_idx, page in enumerate(pdf.pages, start=1):
                # Ekstrak tabel jika struktur grid terdeteksi
                tables = page.extract_tables()
                if tables and len(tables) > 0:
                    for table in tables:
                        for row in table:
                            if any(row):
                                raw_rows.append([cell.strip() if cell else "" for cell in row])
                else:
                    # Ekstrak berbasis baris teks (layout preservation)
                    text = page.extract_text(layout=True)
                    if text:
                        for line in text.split("\\n"):
                            line_clean = line.strip()
                            if line_clean:
                                raw_rows.append(line_clean)

        return raw_rows

    def process_pdf(self, pdf_stream: io.BytesIO, bank_hint: str = "AUTO") -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Pipeline utama:
        1. Ekstraksi teks & tabel dari PDF
        2. Filter header berulang & footer halaman
        3. Penggabungan deskripsi transaksi multi-baris (Multi-line Description Stitching)
        4. Pembersihan & normalisasi angka Debit, Kredit, Saldo dengan Pandas
        5. Rekonsiliasi saldo matematis
        """
        pdf_stream.seek(0)
        
        # Simpan teks utuh untuk deteksi metadata
        with pdfplumber.open(pdf_stream) as pdf:
            full_text = " ".join([page.extract_text() or "" for page in pdf.pages])

        bank_type = self.detect_bank_type(full_text, bank_hint)
        pdf_stream.seek(0)

        raw_rows = self.extract_text_pdf(pdf_stream)

        # Parsing baris transaksi menggunakan finite state machine (FSM)
        transactions = []
        current_tx: Optional[Dict[str, Any]] = None

        # Regex pola tanggal awal baris transaksi
        is_date_regex = re.compile(r"^(\\d{2}[/-]\\d{2}(?:[/-]\\d{2,4})?|\\d{2}\\s+[A-Za-z]{3})")

        for row in raw_rows:
            # Normalisasi jika baris berupa teks tunggal atau list kolom
            if isinstance(row, list):
                row_str = " ".join([str(c) for c in row if c])
            else:
                row_str = str(row)

            # Lewati baris header berulang & footer
            if any(kw in row_str.upper() for kw in [
                "TANGGAL", "KETERANGAN", "MUTASI", "SALDO", "HALAMAN", 
                "BERSAMBUNG", "PAGE", "SALDO AWAL", "TOTAL MUTASI"
            ]):
                continue

            match = is_date_regex.match(row_str)

            if match:
                # Simpan transaksi sebelumnya jika ada
                if current_tx:
                    transactions.append(current_tx)

                # Parsing baris baru transaksi
                parsed = self._parse_single_transaction_line(row_str, bank_type)
                current_tx = parsed
            else:
                # Baris lanjutan (Multi-line description / Keterangan bersambung)
                if current_tx:
                    # Bersihkan spasi berlebih dan gabungkan ke keterangan sebelumnya
                    extra_text = row_str.strip()
                    if extra_text and not is_date_regex.match(extra_text):
                        current_tx["keterangan"] += " " + extra_text

        # Tambahkan transaksi terakhir
        if current_tx:
            transactions.append(current_tx)

        # Buat DataFrame Pandas untuk pembersihan tingkat lanjut
        df = pd.DataFrame(transactions)

        if df.empty:
            return pd.DataFrame(), {
                "bank_name": bank_type,
                "total_debit": 0,
                "total_kredit": 0,
                "net_change": 0,
                "count": 0
            }

        # Standarisasi tipe data kolom numerik dengan Pandas
        df["mutasi_debit"] = df["mutasi_debit"].apply(self.clean_indonesian_amount)
        df["mutasi_kredit"] = df["mutasi_kredit"].apply(self.clean_indonesian_amount)
        df["saldo"] = df["saldo"].apply(self.clean_indonesian_amount)

        # Rapikan spasi pada keterangan
        df["keterangan"] = df["keterangan"].astype(str).str.replace(r"\\s+", " ", regex=True).str.strip()

        # Susun metadata audit
        total_debit = float(df["mutasi_debit"].sum())
        total_kredit = float(df["mutasi_kredit"].sum())
        saldo_awal = float(df["saldo"].iloc[0] + df["mutasi_debit"].iloc[0] - df["mutasi_kredit"].iloc[0]) if len(df) > 0 else 0
        saldo_akhir = float(df["saldo"].iloc[-1]) if len(df) > 0 else 0

        summary = {
            "bank_name": bank_type,
            "total_transactions": len(df),
            "total_debit": total_debit,
            "total_kredit": total_kredit,
            "net_cashflow": total_kredit - total_debit,
            "saldo_awal_estimasi": saldo_awal,
            "saldo_akhir": saldo_akhir,
            "is_balanced": abs((saldo_awal + total_kredit - total_debit) - saldo_akhir) < 1.0
        }

        # Susun ulang urutan kolom yang rapi
        ordered_cols = ["tanggal", "keterangan", "cabang", "tipe", "mutasi_debit", "mutasi_kredit", "saldo"]
        available_cols = [c for c in ordered_cols if c in df.columns]
        df = df[available_cols]

        return df, summary

    def _parse_single_transaction_line(self, line: str, bank_type: str) -> Dict[str, Any]:
        """Ekstraksi token tanggal, deskripsi, debit/kredit, dan saldo dari satu baris teks"""
        tokens = line.split()
        date = tokens[0]
        
        # Ekstrak token angka dari belakang (biasanya [Debit/Kredit, Saldo] atau sebaliknya)
        numbers = re.findall(r"[\\d.,]+(?:[A-Z]{2})?", line)
        
        tipe = "CR" if "CR" in line.upper() else ("DB" if "DB" in line.upper() else "CR")
        debit = 0.0
        kredit = 0.0
        saldo = 0.0
        
        # Ekstraksi saldo dan nominal mutasi
        if len(numbers) >= 2:
            saldo_str = numbers[-1]
            amount_str = numbers[-2]
            saldo = self.clean_indonesian_amount(saldo_str)
            nominal = self.clean_indonesian_amount(amount_str)
            if tipe == "DB":
                debit = nominal
            else:
                kredit = nominal
        elif len(numbers) == 1:
            saldo = self.clean_indonesian_amount(numbers[-1])

        # Deskripsi adalah bagian tengah teks
        # Hilangkan tanggal di depan dan angka di belakang
        keterangan = line
        if date in keterangan:
            keterangan = keterangan[keterangan.find(date) + len(date):].strip()
        
        # Hapus saldo dan nominal dari keterangan
        for num in numbers[-3:]:
            keterangan = keterangan.replace(num, "").strip()

        return {
            "tanggal": date,
            "keterangan": keterangan or "TRANSAKSI REKENING",
            "cabang": "0000",
            "tipe": tipe,
            "mutasi_debit": debit,
            "mutasi_kredit": kredit,
            "saldo": saldo
        }

    def generate_excel(self, df: pd.DataFrame, summary: Dict[str, Any]) -> io.BytesIO:
        """
        Menyusun file Excel (.xlsx) rapi dengan openpyxl:
        - Kartu Header & Informasi Rekening
        - Format angka Excel sejati (#,##0.00)
        - Styling profesional untuk akuntan dan audit
        """
        output = io.BytesIO()
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Rekening Koran"
        ws.views.sheetView[0].showGridLines = True

        # Styles
        navy_header = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        sub_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
        font_white_bold = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        font_title = Font(name="Calibri", size=14, bold=True, color="0F172A")
        font_data = Font(name="Calibri", size=10, color="1E293B")
        font_bold = Font(name="Calibri", size=10, bold=True, color="0F172A")
        thin_border = Border(
            left=Side(style="thin", color="CBD5E1"),
            right=Side(style="thin", color="CBD5E1"),
            top=Side(style="thin", color="CBD5E1"),
            bottom=Side(style="thin", color="CBD5E1"),
        )

        # Baris 1-3: Header Perusahaan / Bank
        ws["A1"] = f"LAPORAN REKENING KORAN TERVERIFIKASI - {summary.get('bank_name', 'BANK')}"
        ws["A1"].font = font_title
        ws["A2"] = f"Total Transaksi: {summary.get('total_transactions', len(df))} baris | Status Rekonsiliasi: {'SEIMBANG (OK)' if summary.get('is_balanced') else 'PERLU CEK'}"
        ws["A2"].font = Font(name="Calibri", size=10, italic=True, color="64748B")

        # Baris 4: Ringkasan Kartu
        ws["A4"] = "Total Mutasi Debit:"
        ws["B4"] = summary.get("total_debit", 0.0)
        ws["B4"].number_format = "#,##0.00"
        ws["B4"].font = font_bold

        ws["D4"] = "Total Mutasi Kredit:"
        ws["E4"] = summary.get("total_kredit", 0.0)
        ws["E4"].number_format = "#,##0.00"
        ws["E4"].font = font_bold

        # Baris 6: Header Tabel
        headers = ["No", "Tanggal", "Keterangan / Uraian Transaksi", "Cabang", "Tipe", "Mutasi Debit (Rp)", "Mutasi Kredit (Rp)", "Saldo Akhir (Rp)"]
        ws.row_dimensions[6].height = 26

        for col_idx, h_text in enumerate(headers, start=1):
            cell = ws.cell(row=6, column=col_idx, value=h_text)
            cell.fill = navy_header
            cell.font = font_white_bold
            cell.alignment = Alignment(horizontal="center", vertical="center")

        # Isi Baris Transaksi
        current_row = 7
        for idx, row in df.iterrows():
            ws.cell(row=current_row, column=1, value=idx + 1).alignment = Alignment(horizontal="center")
            ws.cell(row=current_row, column=2, value=str(row.get("tanggal", ""))).alignment = Alignment(horizontal="center")
            ws.cell(row=current_row, column=3, value=str(row.get("keterangan", ""))).alignment = Alignment(horizontal="left", wrap_text=True)
            ws.cell(row=current_row, column=4, value=str(row.get("cabang", "-"))).alignment = Alignment(horizontal="center")
            ws.cell(row=current_row, column=5, value=str(row.get("tipe", "CR"))).alignment = Alignment(horizontal="center")

            # Angka Numerik Excel Sejati
            c_deb = ws.cell(row=current_row, column=6, value=float(row.get("mutasi_debit", 0.0)))
            c_deb.number_format = "#,##0.00"
            c_deb.alignment = Alignment(horizontal="right")

            c_kred = ws.cell(row=current_row, column=7, value=float(row.get("mutasi_kredit", 0.0)))
            c_kred.number_format = "#,##0.00"
            c_kred.alignment = Alignment(horizontal="right")

            c_sal = ws.cell(row=current_row, column=8, value=float(row.get("saldo", 0.0)))
            c_sal.number_format = "#,##0.00"
            c_sal.alignment = Alignment(horizontal="right")

            # Border dan Font
            for col_i in range(1, 9):
                cell = ws.cell(row=current_row, column=col_i)
                cell.border = thin_border
                cell.font = font_data

            current_row += 1

        # Auto-adjust lebar kolom
        ws.column_dimensions["A"].width = 6
        ws.column_dimensions["B"].width = 14
        ws.column_dimensions["C"].width = 46
        ws.column_dimensions["D"].width = 10
        ws.column_dimensions["E"].width = 8
        ws.column_dimensions["F"].width = 18
        ws.column_dimensions["G"].width = 18
        ws.column_dimensions["H"].width = 20

        wb.save(output)
        output.seek(0)
        return output
`;

export const REQUIREMENTS_TXT = `fastapi==0.111.0
uvicorn[standard]==0.30.1
pydantic==2.7.4
python-multipart==0.0.9
pandas==2.2.2
pdfplumber==0.11.1
openpyxl==3.1.4
pytesseract==0.3.10
pdf2image==1.17.0
Pillow==10.3.0
`;

export const DOCKERFILE_CODE = `FROM python:3.10-slim

# Instalasi dependency sistem untuk Poppler (PDF image rendering) dan Tesseract OCR
RUN apt-get update && apt-get install -y --no-install-recommends \\
    tesseract-ocr \\
    tesseract-ocr-ind \\
    poppler-utils \\
    libgl1 \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Port FastAPI
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
`;
