"""
Core Engine: Ekstraksi Tabel Rekening Koran & Pembersihan Data dengan Pandas
File: backend/statement_processor.py
"""

import io
import re
from typing import Dict, Any, Tuple, List, Optional
import pandas as pd
import pdfplumber
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Fallback OCR opsional jika dokumen PDF berupa hasil scan/gambar
try:
    import pytesseract
    from pdf2image import convert_from_bytes
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False


class BankStatementProcessor:
    """
    Processor untuk mendeteksi tipe bank, mengekstrak tabel,
    menggabungkan multi-line description, menstandarkan mata uang,
    dan menyusun file Excel profesional.
    """

    def __init__(self):
        # Regex pola tanggal awal transaksi (DD/MM, DD/MM/YYYY, DD-MMM-YYYY, dsb)
        self.date_regex = re.compile(
            r"^(\d{2}[/-]\d{2}(?:[/-]\d{2,4})?|\d{2}\s+(?:JAN|FEB|MAR|APR|MEI|JUN|JUL|AGU|SEP|OKT|NOV|DES))\b",
            re.IGNORECASE
        )

    def clean_indonesian_amount(self, val: Any) -> float:
        """
        Membersihkan dan menstandarkan format angka Indonesia ke float numerik:
        Input contoh: '1.250.000,00', '1,250,000.00', '250.000', ' - ', None
        Output: 1250000.0
        """
        if pd.isna(val) or val is None:
            return 0.0

        s = str(val).strip()
        if not s or s in ["-", "--", "0", "0.00"]:
            return 0.0

        # Hapus simbol mata uang dan spasi
        s = re.sub(r"(?:Rp\.?|IDR)", "", s, flags=re.IGNORECASE).strip()

        # Deteksi format Indonesia (titik sebagai ribuan, koma sebagai desimal)
        if "." in s and "," in s:
            if s.rfind(",") > s.rfind("."):
                # Format IDR: 1.250.000,00 -> titik dihapus, koma diganti titik
                s = s.replace(".", "").replace(",", ".")
            else:
                # Format US: 1,250,000.00
                s = s.replace(",", "")
        elif "," in s:
            # Jika koma 2 digit di belakang -> desimal
            parts = s.split(",")
            if len(parts) == 2 and len(parts[1]) == 2:
                s = s.replace(",", ".")
            else:
                s = s.replace(",", "")
        elif "." in s:
            if s.count(".") > 1:
                # Lebih dari 1 titik pasti pemisah ribuan (e.g. 1.250.000)
                s = s.replace(".", "")
            else:
                parts = s.split(".")
                if len(parts) == 2 and len(parts[1]) == 3:
                    s = s.replace(".", "")

        # Hapus karakter non-numerik selain minus dan titik
        s = re.sub(r"[^0-9.-]", "", s)

        try:
            return float(s) if s else 0.0
        except ValueError:
            return 0.0

    def detect_bank_type(self, full_text: str, bank_hint: str = "AUTO") -> str:
        """Mendeteksi jenis template bank dari header teks"""
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

    def extract_text_pdf(self, pdf_stream: io.BytesIO) -> List[str]:
        """
        Mengekstrak baris-baris teks layout dari PDF menggunakan pdfplumber.
        Jika PDF berupa scan dan OCR tersedia, akan menggunakan pytesseract sebagai fallback.
        """
        extracted_lines = []

        with pdfplumber.open(pdf_stream) as pdf:
            for page in pdf.pages:
                text = page.extract_text(layout=True)
                if text and text.strip():
                    for line in text.split("\n"):
                        clean_l = line.strip()
                        if clean_l:
                            extracted_lines.append(clean_l)
                elif OCR_AVAILABLE:
                    # Fallback OCR jika halaman kosong dari teks vektor (scan dokumen)
                    pdf_stream.seek(0)
                    images = convert_from_bytes(pdf_stream.getvalue(), first_page=page.page_number, last_page=page.page_number)
                    if images:
                        ocr_text = pytesseract.image_to_string(images[0], lang="ind+eng")
                        for line in ocr_text.split("\n"):
                            clean_l = line.strip()
                            if clean_l:
                                extracted_lines.append(clean_l)

        return extracted_lines

    def process_pdf(self, pdf_stream: io.BytesIO, bank_hint: str = "AUTO") -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Pipeline Pembersihan Data:
        1. Ekstraksi baris teks dari PDF
        2. Penyaringan baris header berulang & footer halaman
        3. Penggabungan deskripsi transaksi yang terpotong (Multi-line Description Stitching)
        4. Pembersihan format angka ke float numerik dengan Pandas
        5. Rekonsiliasi saldo matematis
        """
        pdf_stream.seek(0)
        raw_lines = self.extract_text_pdf(pdf_stream)

        full_text = " ".join(raw_lines[:50])
        bank_type = self.detect_bank_type(full_text, bank_hint)

        transactions: List[Dict[str, Any]] = []
        current_tx: Optional[Dict[str, Any]] = None

        # Filter kata kunci header/footer berulang
        noise_keywords = [
            "HALAMAN", "PAGE", "BERSAMBUNG", "TANGGAL TRANSAKSI", 
            "URAIAN TRANSAKSI", "SALDO AWAL", "TOTAL MUTASI", "TANGGAL VALUTA"
        ]

        for line in raw_lines:
            line_upper = line.upper()
            if any(kw in line_upper for kw in noise_keywords):
                continue

            match = self.date_regex.match(line)

            if match:
                # Jika baris baru diawali tanggal, simpan transaksi sebelumnya
                if current_tx:
                    transactions.append(current_tx)

                # Parse baris transaksi baru
                current_tx = self._parse_transaction_line(line, bank_type)
            else:
                # Baris lanjutan (Multi-line Description Stitching)
                if current_tx:
                    # Gabungkan baris tambahan ke dalam kolom keterangan
                    current_tx["keterangan"] += " " + line.strip()

        # Tambahkan transaksi terakhir
        if current_tx:
            transactions.append(current_tx)

        # Buat DataFrame Pandas untuk pembersihan data terstruktur
        df = pd.DataFrame(transactions)

        if df.empty:
            return pd.DataFrame(), {
                "bank_name": bank_type,
                "total_transactions": 0,
                "total_debit": 0.0,
                "total_kredit": 0.0,
                "net_cashflow": 0.0,
                "saldo_akhir": 0.0,
                "is_balanced": True
            }

        # Normalisasi angka dengan Pandas
        df["mutasi_debit"] = df["mutasi_debit"].apply(self.clean_indonesian_amount)
        df["mutasi_kredit"] = df["mutasi_kredit"].apply(self.clean_indonesian_amount)
        df["saldo"] = df["saldo"].apply(self.clean_indonesian_amount)

        # Bersihkan spasi ganda dan karakter khusus pada teks keterangan
        df["keterangan"] = df["keterangan"].astype(str).str.replace(r"\s+", " ", regex=True).str.strip()

        # Hitung audit ringkasan kas
        total_debit = float(df["mutasi_debit"].sum())
        total_kredit = float(df["mutasi_kredit"].sum())
        saldo_akhir = float(df["saldo"].iloc[-1]) if len(df) > 0 else 0.0
        saldo_awal = float(df["saldo"].iloc[0] + df["mutasi_debit"].iloc[0] - df["mutasi_kredit"].iloc[0]) if len(df) > 0 else 0.0

        summary = {
            "bank_name": bank_type,
            "total_transactions": len(df),
            "total_debit": total_debit,
            "total_kredit": total_kredit,
            "net_cashflow": total_kredit - total_debit,
            "saldo_awal_estimasi": saldo_awal,
            "saldo_akhir": saldo_akhir,
            "is_balanced": abs((saldo_awal + total_kredit - total_debit) - saldo_akhir) < 2.0
        }

        # Urutkan kolom agar seragam
        ordered_cols = ["tanggal", "keterangan", "cabang", "tipe", "mutasi_debit", "mutasi_kredit", "saldo"]
        df = df[[c for c in ordered_cols if c in df.columns]]

        return df, summary

    def _parse_transaction_line(self, line: str, bank_type: str) -> Dict[str, Any]:
        """Ekstraksi token tanggal, keterangan, debit/kredit, dan saldo dari satu baris"""
        tokens = line.split()
        tanggal = tokens[0]

        is_db = bool(re.search(r"\b(DB|DEBIT|DEBET)\b", line, re.IGNORECASE))
        is_cr = bool(re.search(r"\b(CR|KREDIT)\b", line, re.IGNORECASE)) or not is_db

        # Cari semua token nominal numerik
        numbers = re.findall(r"\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?\b", line)

        debit = 0.0
        kredit = 0.0
        saldo = 0.0

        if len(numbers) >= 2:
            saldo = self.clean_indonesian_amount(numbers[-1])
            mutasi = self.clean_indonesian_amount(numbers[-2])
            if is_db:
                debit = mutasi
            else:
                kredit = mutasi
        elif len(numbers) == 1:
            saldo = self.clean_indonesian_amount(numbers[0])

        # Ambil uraian keterangan di tengah
        keterangan = line
        if tanggal in keterangan:
            keterangan = keterangan[keterangan.find(tanggal) + len(tanggal):].strip()

        # Hilangkan angka nominal dari kolom teks keterangan
        for n in numbers[-2:]:
            keterangan = keterangan.replace(n, "").strip()

        keterangan = re.sub(r"\b(DB|CR|DEBET|KREDIT)\b", "", keterangan, flags=re.IGNORECASE).strip()

        return {
            "tanggal": tanggal,
            "keterangan": keterangan or "TRANSAKSI REKENING",
            "cabang": "0000",
            "tipe": "DB" if is_db else "CR",
            "mutasi_debit": debit,
            "mutasi_kredit": kredit,
            "saldo": saldo
        }

    def generate_excel(self, df: pd.DataFrame, summary: Dict[str, Any]) -> io.BytesIO:
        """
        Menyusun file Excel (.xlsx) dengan openpyxl:
        - Tipe sel numerik (#,##0.00) agar langsung bisa di-=SUM() di Excel
        - Header bergaya corporate navy dan auto-fit lebar kolom
        """
        output = io.BytesIO()
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Rekening Koran"
        ws.views.sheetView[0].showGridLines = True

        # Styles
        navy_header = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
        font_white_bold = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        font_data = Font(name="Calibri", size=10, color="1E293B")
        font_bold = Font(name="Calibri", size=10, bold=True, color="0F172A")
        thin_border = Border(
            left=Side(style="thin", color="CBD5E1"),
            right=Side(style="thin", color="CBD5E1"),
            top=Side(style="thin", color="CBD5E1"),
            bottom=Side(style="thin", color="CBD5E1"),
        )

        # Judul & Ringkasan Dokumen
        ws["A1"] = f"LAPORAN REKENING KORAN TERVERIFIKASI - {summary.get('bank_name', 'BANK')}"
        ws["A1"].font = Font(name="Calibri", size=13, bold=True, color="0F172A")
        ws["A2"] = f"Total Transaksi: {summary.get('total_transactions', len(df))} baris | Status Rekonsiliasi: {'SEIMBANG' if summary.get('is_balanced') else 'PERLU PENYESUAIAN'}"
        ws["A2"].font = Font(name="Calibri", size=10, italic=True, color="64748B")

        # Ringkasan KPI
        ws["A4"] = "Total Mutasi Debit:"
        ws["B4"] = summary.get("total_debit", 0.0)
        ws["B4"].number_format = "#,##0.00"
        ws["B4"].font = font_bold

        ws["D4"] = "Total Mutasi Kredit:"
        ws["E4"] = summary.get("total_kredit", 0.0)
        ws["E4"].number_format = "#,##0.00"
        ws["E4"].font = font_bold

        # Header Tabel
        headers = ["No", "Tanggal", "Keterangan / Uraian Transaksi", "Cabang", "Tipe", "Mutasi Debit (Rp)", "Mutasi Kredit (Rp)", "Saldo Akhir (Rp)"]
        ws.row_dimensions[6].height = 25

        for col_idx, text in enumerate(headers, start=1):
            cell = ws.cell(row=6, column=col_idx, value=text)
            cell.fill = navy_header
            cell.font = font_white_bold
            cell.alignment = Alignment(horizontal="center", vertical="center")

        # Isi Data Transaksi
        current_row = 7
        for idx, row in df.iterrows():
            ws.cell(row=current_row, column=1, value=idx + 1).alignment = Alignment(horizontal="center")
            ws.cell(row=current_row, column=2, value=str(row.get("tanggal", ""))).alignment = Alignment(horizontal="center")
            ws.cell(row=current_row, column=3, value=str(row.get("keterangan", ""))).alignment = Alignment(horizontal="left", wrap_text=True)
            ws.cell(row=current_row, column=4, value=str(row.get("cabang", "-"))).alignment = Alignment(horizontal="center")
            ws.cell(row=current_row, column=5, value=str(row.get("tipe", "CR"))).alignment = Alignment(horizontal="center")

            # Kolom Angka Numerik Excel
            c_deb = ws.cell(row=current_row, column=6, value=float(row.get("mutasi_debit", 0.0)))
            c_deb.number_format = "#,##0.00"
            c_deb.alignment = Alignment(horizontal="right")

            c_kred = ws.cell(row=current_row, column=7, value=float(row.get("mutasi_kredit", 0.0)))
            c_kred.number_format = "#,##0.00"
            c_kred.alignment = Alignment(horizontal="right")

            c_sal = ws.cell(row=current_row, column=8, value=float(row.get("saldo", 0.0)))
            c_sal.number_format = "#,##0.00"
            c_sal.alignment = Alignment(horizontal="right")

            for col_i in range(1, 9):
                cell = ws.cell(row=current_row, column=col_i)
                cell.border = thin_border
                cell.font = font_data

            current_row += 1

        # Lebar Kolom yang disesuaikan
        widths = {"A": 6, "B": 14, "C": 48, "D": 10, "E": 8, "F": 20, "G": 20, "H": 22}
        for col_letter, width in widths.items():
            ws.column_dimensions[col_letter].width = width

        wb.save(output)
        output.seek(0)
        return output
