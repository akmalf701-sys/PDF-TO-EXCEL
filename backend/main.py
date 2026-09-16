"""
Backend API: FastAPI Server untuk Konversi Rekening Koran ke Excel (.xlsx)
File: backend/main.py
"""

import io
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from statement_processor import BankStatementProcessor

app = FastAPI(
    title="Rekening Koran to Excel Converter API",
    description="SaaS Engine untuk konversi & data cleaning rekening koran perbankan Indonesia",
    version="1.0.0"
)

# Konfigurasi CORS agar frontend (React / Next.js) dapat memanggil API
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
    """Health check endpoint untuk monitoring & container orchestrator"""
    return {
        "status": "healthy",
        "service": "Bank Statement Parser Service",
        "supported_banks": ["BCA", "MANDIRI", "BNI", "BRI", "GENERIC_AUTO"]
    }


@app.post("/api/parse-statement")
async def parse_statement(
    file: UploadFile = File(..., description="File PDF Rekening Koran"),
    bank_type: Optional[str] = Query("AUTO", description="Pilihan bank: BCA, MANDIRI, BNI, BRI, atau AUTO"),
    preview_rows: Optional[int] = Query(10, description="Jumlah baris pratinjau yang diminta (default: 10)")
):
    """
    Endpoint untuk mengunggah PDF, memproses secara in-memory di RAM (tanpa simpan ke disk),
    dan mengembalikan metadata + pratinjau data (5-10 baris pertama).
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Hanya file berekstensi .pdf yang diperbolehkan.")

    try:
        # Baca konten file secara langsung ke memori menggunakan BytesIO
        file_bytes = await file.read()
        pdf_stream = io.BytesIO(file_bytes)

        # Ekstraksi dan pembersihan data menggunakan Core Processor
        df, summary = processor.process_pdf(pdf_stream, bank_hint=bank_type)

        if df.empty:
            raise HTTPException(
                status_code=422,
                detail="Tidak ada baris transaksi yang berhasil diekstraksi dari PDF. Periksa apakah file di-password atau menggunakan format scan tanpa OCR."
            )

        # Potong pratinjau data sesuai batas (5 atau 10 baris pertama)
        preview_df = df.head(preview_rows)
        preview_records = preview_df.to_dict(orient="records")

        return {
            "success": True,
            "filename": file.filename,
            "file_size_bytes": len(file_bytes),
            "summary": summary,
            "total_transactions": len(df),
            "preview": preview_records,
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
    bank_type: Optional[str] = Query("AUTO", description="Pilihan bank: BCA, MANDIRI, BNI, BRI, atau AUTO")
):
    """
    Endpoint untuk memproses PDF dan mengembalikan stream file Excel (.xlsx) berformat rapi.
    File .xlsx dibuat secara in-memory dan langsung di-stream ke browser pengguna.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Hanya file .pdf yang valid.")

    try:
        file_bytes = await file.read()
        pdf_stream = io.BytesIO(file_bytes)

        # Proses data menggunakan Core Processor
        df, summary = processor.process_pdf(pdf_stream, bank_hint=bank_type)

        # Susun file Excel dengan openpyxl (angka numerik sejati)
        excel_buffer = processor.generate_excel(df, summary)

        base_name = file.filename.rsplit(".", 1)[0]
        output_filename = f"{base_name}_converted.xlsx"

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
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
