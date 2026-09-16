import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

const doc = new jsPDF({
  orientation: 'p',
  unit: 'mm',
  format: 'a4'
});

// Primary colors
const colorDarkNavy = [15, 23, 42]; // #0f172a
const colorBcaBlue = [0, 90, 160];  // BCA Blue
const colorMuted = [100, 116, 139]; // #64748b
const colorLine = [226, 232, 240];  // #e2e8f0

// 1. Header Bank
doc.setFont('helvetica', 'bold');
doc.setFontSize(16);
doc.setTextColor(...colorBcaBlue);
doc.text('PT BANK CENTRAL ASIA TBK', 14, 18);

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(...colorMuted);
doc.text('KANTOR CABANG UTAMA SUDIRMAN', 14, 23);
doc.text('Jl. Jend. Sudirman Kav. 1, Jakarta 10220', 14, 27);

doc.setFont('helvetica', 'bold');
doc.setFontSize(13);
doc.setTextColor(...colorDarkNavy);
doc.text('REKENING TAHAPAN BCA', 140, 18, { align: 'left' });

doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(...colorMuted);
doc.text('Lembar e-Statement Nasangan Perorangan', 140, 23);

// Divider line
doc.setDrawColor(...colorBcaBlue);
doc.setLineWidth(0.8);
doc.line(14, 31, 196, 31);

// 2. Metadata Nasabah & Periode
doc.setFillColor(248, 250, 252);
doc.roundedRect(14, 34, 182, 24, 2, 2, 'F');
doc.setDrawColor(...colorLine);
doc.setLineWidth(0.3);
doc.roundedRect(14, 34, 182, 24, 2, 2, 'D');

doc.setFont('helvetica', 'bold');
doc.setFontSize(8.5);
doc.setTextColor(...colorDarkNavy);
doc.text('NO. REKENING', 18, 41);
doc.text('NAMA NASABAH', 18, 47);
doc.text('MATA UANG', 18, 53);

doc.setFont('helvetica', 'normal');
doc.text(': 8820491823', 48, 41);
doc.text(': AKMAL FATHURRAHMAN', 48, 47);
doc.text(': IDR (Rupiah)', 48, 53);

doc.setFont('helvetica', 'bold');
doc.text('PERIODE', 115, 41);
doc.text('SALDO AWAL', 115, 47);
doc.text('CABANG PEMBUKA', 115, 53);

doc.setFont('helvetica', 'normal');
doc.text(': 01/08/2024 - 31/08/2024', 145, 41);
doc.text(': Rp 15,250,000.00', 145, 47);
doc.text(': 0950 - KCU SUDIRMAN', 145, 53);

// 3. Header Tabel Transaksi
const startY = 64;
doc.setFillColor(15, 23, 42);
doc.rect(14, startY, 182, 7, 'F');

doc.setFont('helvetica', 'bold');
doc.setFontSize(8);
doc.setTextColor(255, 255, 255);
doc.text('TGL', 16, startY + 4.8);
doc.text('KETERANGAN TRANSAKSI', 36, startY + 4.8);
doc.text('CBG', 118, startY + 4.8, { align: 'center' });
doc.text('MUTASI (RP)', 154, startY + 4.8, { align: 'right' });
doc.text('SALDO (RP)', 192, startY + 4.8, { align: 'right' });

// 4. Data Transaksi
const txs = [
  {
    tgl: '01/08',
    lines: ['SALDO AWAL'],
    cbg: '0950',
    mutasi: '',
    tipe: '',
    saldo: '15,250,000.00'
  },
  {
    tgl: '02/08',
    lines: ['TRSF E-BANKING CR 0208/FTSCY/WS9501', 'PEMBAYARAN JASA IT BULAN JULI', 'DARI PT INOVA CIPTA MANDIRI'],
    cbg: '0950',
    mutasi: '12,500,000.00',
    tipe: 'CR',
    saldo: '27,750,000.00'
  },
  {
    tgl: '05/08',
    lines: ['BI-FAST DB 0508/BIF/998271', 'PEMBAYARAN SEWA SERVER CLOUD', 'PT DIGITAL CLOUD NUSANTARA'],
    cbg: '0950',
    mutasi: '3,500,000.00',
    tipe: 'DB',
    saldo: '24,250,000.00'
  },
  {
    tgl: '08/08',
    lines: ['QRIS DB 0808/QRIS/88271629', 'KOPI KENANGAN GRAND INDONESIA', 'TERMINAL 00192831'],
    cbg: '0000',
    mutasi: '48,000.00',
    tipe: 'DB',
    saldo: '24,202,000.00'
  },
  {
    tgl: '12/08',
    lines: ['TRSF E-BANKING DB 1208/TOKO/99120', 'BELANJA HARDWARE & KABEL LAN', 'TOKOPEDIA KANTOR'],
    cbg: '0950',
    mutasi: '2,150,000.00',
    tipe: 'DB',
    saldo: '22,052,000.00'
  },
  {
    tgl: '17/08',
    lines: ['SETORAN TUNAI CR 1708/CRM/95011', 'SETORAN CASH CDM KCU SUDIRMAN'],
    cbg: '0950',
    mutasi: '5,000,000.00',
    tipe: 'CR',
    saldo: '27,052,000.00'
  },
  {
    tgl: '25/08',
    lines: ['TRSF E-BANKING DB 2508/PAYROLL/09', 'GAJI KARYAWAN PERIODE AGUSTUS', 'TRANSFER MULTI REKENING'],
    cbg: '0950',
    mutasi: '14,500,000.00',
    tipe: 'DB',
    saldo: '12,552,000.00'
  },
  {
    tgl: '31/08',
    lines: ['BUNGA TABUNGAN PERIODE AGUSTUS'],
    cbg: '0950',
    mutasi: '18,500.00',
    tipe: 'CR',
    saldo: '12,570,500.00'
  },
  {
    tgl: '31/08',
    lines: ['PAJAK BUNGA 20%'],
    cbg: '0950',
    mutasi: '3,700.00',
    tipe: 'DB',
    saldo: '12,566,800.00'
  }
];

let currY = startY + 7;

txs.forEach((tx, idx) => {
  const rowHeight = Math.max(7, tx.lines.length * 4.2 + 2);

  // Alternate row background
  if (idx % 2 === 1) {
    doc.setFillColor(248, 250, 252);
    doc.rect(14, currY, 182, rowHeight, 'F');
  }

  // Row bottom divider
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.2);
  doc.line(14, currY + rowHeight, 196, currY + rowHeight);

  // Tanggal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...colorDarkNavy);
  doc.text(tx.tgl, 16, currY + 4.5);

  // Keterangan (multi-line)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  tx.lines.forEach((line, lineIdx) => {
    doc.text(line, 36, currY + 4.5 + (lineIdx * 4));
  });

  // Cabang
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...colorMuted);
  doc.text(tx.cbg, 118, currY + 4.5, { align: 'center' });

  // Mutasi
  if (tx.mutasi) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    if (tx.tipe === 'CR') {
      doc.setTextColor(21, 128, 61); // Green
    } else {
      doc.setTextColor(185, 28, 28); // Red
    }
    doc.text(`${tx.mutasi} ${tx.tipe}`, 154, currY + 4.5, { align: 'right' });
  }

  // Saldo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...colorDarkNavy);
  doc.text(tx.saldo, 192, currY + 4.5, { align: 'right' });

  currY += rowHeight;
});

// 5. Summary Footer Box
currY += 6;
doc.setFillColor(241, 245, 249);
doc.roundedRect(14, currY, 182, 22, 2, 2, 'F');
doc.setDrawColor(...colorLine);
doc.setLineWidth(0.3);
doc.roundedRect(14, currY, 182, 22, 2, 2, 'D');

doc.setFont('helvetica', 'bold');
doc.setFontSize(8);
doc.setTextColor(...colorDarkNavy);
doc.text('RINGKASAN MUTASI REKENING KORAN', 18, currY + 6);

doc.setFont('helvetica', 'normal');
doc.setFontSize(7.5);
doc.setTextColor(...colorMuted);
doc.text('Total Mutasi Kredit (CR) : ', 18, currY + 12);
doc.setFont('helvetica', 'bold');
doc.setTextColor(21, 128, 61);
doc.text('Rp 17,518,500.00', 58, currY + 12);

doc.setFont('helvetica', 'normal');
doc.setTextColor(...colorMuted);
doc.text('Total Mutasi Debit (DB)  : ', 18, currY + 17);
doc.setFont('helvetica', 'bold');
doc.setTextColor(185, 28, 28);
doc.text('Rp 20,201,700.00', 58, currY + 17);

doc.setFont('helvetica', 'normal');
doc.setTextColor(...colorMuted);
doc.text('Saldo Awal               : ', 115, currY + 12);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...colorDarkNavy);
doc.text('Rp 15,250,000.00', 145, currY + 12);

doc.setFont('helvetica', 'normal');
doc.setTextColor(...colorMuted);
doc.text('Saldo Akhir              : ', 115, currY + 17);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...colorDarkNavy);
doc.text('Rp 12,566,800.00', 145, currY + 17);

// Footer notice
currY += 28;
doc.setFont('helvetica', 'italic');
doc.setFontSize(7);
doc.setTextColor(...colorMuted);
doc.text('* Dokumen ini adalah contoh e-Statement mutasi rekening PT Bank Central Asia Tbk untuk keperluan pengujian sistem converter.', 14, currY);
doc.text('Dicetak otomatis oleh Rekening Koran to Google Sheets System.', 14, currY + 4);

const outDir = path.resolve('public');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
const outPath = path.join(outDir, 'sample_mutasi_bca.pdf');
const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
fs.writeFileSync(outPath, pdfBuffer);

console.log('Sample PDF successfully created at:', outPath, 'size:', pdfBuffer.length, 'bytes');
