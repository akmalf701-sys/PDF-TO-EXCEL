import { BankConfig, Transaction, StatementSummary } from '../types';

export const SUPPORTED_BANKS: BankConfig[] = [
  {
    id: 'AUTO',
    name: 'Auto Detect (Paling Fleksibel)',
    color: 'emerald',
    badge: 'Smart Engine',
    dateFormats: ['DD/MM', 'DD/MM/YYYY', 'DD-MM-YYYY'],
    description: 'Secara cerdas memindai pola tanggal, multi-line notes, dan saldo dari seluruh bank Indonesia'
  },
  {
    id: 'BCA',
    name: 'BCA (Bank Central Asia)',
    color: 'blue',
    badge: 'e-Statement',
    dateFormats: ['DD/MM', 'DD/MM/YYYY'],
    description: 'Mendukung format e-Statement KlikBCA / myBCA dengan penanda CR (Kredit) dan DB (Debit)'
  },
  {
    id: 'MANDIRI',
    name: 'Bank Mandiri',
    color: 'amber',
    badge: 'Livin / Kopra',
    dateFormats: ['DD/MM/YYYY', 'DD-MMM-YYYY'],
    description: 'Format Livin by Mandiri & Mandiri Cash Management dengan kolom Debit/Kredit terpisah'
  },
  {
    id: 'BNI',
    name: 'BNI (Bank Negara Indonesia)',
    color: 'teal',
    badge: 'BNI Direct',
    dateFormats: ['DD-MM-YYYY', 'DD/MM/YYYY'],
    description: 'Format e-Statement BNI Mobile & BNI Direct dengan kolom uraian multi-baris'
  },
  {
    id: 'BRI',
    name: 'BRI (Bank Rakyat Indonesia)',
    color: 'sky',
    badge: 'BRImo',
    dateFormats: ['DD/MM/YY', 'DD/MM/YYYY'],
    description: 'Format BritAma & Simpedes BRImo dengan sandi transaksi dan cabang'
  }
];

export interface SampleStatementPreset {
  id: string;
  bank: 'BCA' | 'MANDIRI' | 'BNI' | 'BRI';
  name: string;
  description: string;
  summary: StatementSummary;
  transactions: Transaction[];
}

export const SAMPLE_BANK_STATEMENTS: SampleStatementPreset[] = [
  {
    id: 'sample-bca',
    bank: 'BCA',
    name: 'Rekening Koran BCA e-Statement',
    description: 'Simulasi e-Statement KlikBCA Individu/Bisnis dengan pola CR/DB dan keterangan transfer multi-baris.',
    summary: {
      bankName: 'PT BANK CENTRAL ASIA TBK',
      accountNumber: '5270-8812-901',
      accountHolder: 'PT DIGITAL SOLUSI NUSANTARA',
      period: '01/08/2024 - 31/08/2024',
      currency: 'IDR',
      saldoAwal: 45250000,
      totalDebit: 32685000,
      totalKredit: 58500000,
      saldoAkhir: 71065000,
      transactionCount: 8,
      isBalanced: true
    },
    transactions: [
      {
        id: 'tx-1',
        tanggal: '01/08/2024',
        keterangan: 'TRSF E-BANKING CR / 0108/FTSCY/WS95011 / INVOICE 2024-0801 JASA CLOUD',
        cabang: '0950',
        tipe: 'CR',
        mutasiDebit: 0,
        mutasiKredit: 25000000,
        saldo: 70250000,
        barisAsli: 1
      },
      {
        id: 'tx-2',
        tanggal: '02/08/2024',
        keterangan: 'BI-FAST DB / 0208/BIF/299102488 / SEWA SERVER CLOUD AWS SINGAPORE',
        cabang: '0950',
        tipe: 'DB',
        mutasiDebit: 8500000,
        mutasiKredit: 0,
        saldo: 61750000,
        barisAsli: 3
      },
      {
        id: 'tx-3',
        tanggal: '05/08/2024',
        keterangan: 'QRIS DB / 0508/QRIS/83912048 / KOPI KENANGAN SENAYAN PARK',
        cabang: '0000',
        tipe: 'DB',
        mutasiDebit: 85000,
        mutasiKredit: 0,
        saldo: 61665000,
        barisAsli: 5
      },
      {
        id: 'tx-4',
        tanggal: '10/08/2024',
        keterangan: 'TRSF E-BANKING DB / 1008/FTSCY/WS95012 / GAJI KARYAWAN PERIODE JULI 2024 BATCH 1',
        cabang: '0950',
        tipe: 'DB',
        mutasiDebit: 24000000,
        mutasiKredit: 0,
        saldo: 37665000,
        barisAsli: 7
      },
      {
        id: 'tx-5',
        tanggal: '15/08/2024',
        keterangan: 'TRSF E-BANKING CR / 1508/FTSCY/WS95015 / PEMBAYARAN KLIEN PT MEGAH JAYA',
        cabang: '0950',
        tipe: 'CR',
        mutasiDebit: 0,
        mutasiKredit: 33500000,
        saldo: 71165000,
        barisAsli: 10
      },
      {
        id: 'tx-6',
        tanggal: '25/08/2024',
        keterangan: 'TARIKAN ATM DB / 2508/ATM/029193 / ATM BCA KCU SUDIRMAN JAKARTA',
        cabang: '0101',
        tipe: 'DB',
        mutasiDebit: 1000000,
        mutasiKredit: 0,
        saldo: 70165000,
        barisAsli: 12
      },
      {
        id: 'tx-7',
        tanggal: '31/08/2024',
        keterangan: 'BUNGA REKENING CR / BUNGA SIMPANAN GIRO BULAN AGUSTUS',
        cabang: '0950',
        tipe: 'CR',
        mutasiDebit: 0,
        mutasiKredit: 920000,
        saldo: 71085000,
        barisAsli: 14
      },
      {
        id: 'tx-8',
        tanggal: '31/08/2024',
        keterangan: 'PAJAK BUNGA DB / PAJAK PPH ATAS BUNGA 20% DITANGGUNG NASABAH',
        cabang: '0950',
        tipe: 'DB',
        mutasiDebit: 20000,
        mutasiKredit: 0,
        saldo: 71065000,
        barisAsli: 16
      }
    ]
  },
  {
    id: 'sample-mandiri',
    bank: 'MANDIRI',
    name: 'Rekening Koran Bank Mandiri',
    description: 'Format Mandiri MCM / Livin dengan kolom transaksi ganda dan deskripsi merchant.',
    summary: {
      bankName: 'PT BANK MANDIRI (PERSERO) TBK',
      accountNumber: '120-00-9831122-3',
      accountHolder: 'CV KARYA MANDIRI ABADI',
      period: '01/07/2024 - 31/07/2024',
      currency: 'IDR',
      saldoAwal: 82100000,
      totalDebit: 41250000,
      totalKredit: 65000000,
      saldoAkhir: 105850000,
      transactionCount: 6,
      isBalanced: true
    },
    transactions: [
      {
        id: 'tx-m-1',
        tanggal: '02/07/2024',
        keterangan: 'PEMINDAHBUKUAN DARI 130009182391 / INVOICE JASA KONSULTASI IT Q3',
        cabang: '12001',
        tipe: 'CR',
        mutasiDebit: 0,
        mutasiKredit: 45000000,
        saldo: 127100000,
        barisAsli: 1
      },
      {
        id: 'tx-m-2',
        tanggal: '08/07/2024',
        keterangan: 'PEMBAYARAN VENDOR PT SINAR TEKNOLOGI / PERALATAN KANTOR DAN LAPTOP',
        cabang: '12001',
        tipe: 'DB',
        mutasiDebit: 28500000,
        mutasiKredit: 0,
        saldo: 98600000,
        barisAsli: 3
      },
      {
        id: 'tx-m-3',
        tanggal: '15/07/2024',
        keterangan: 'TRANSFER MASUK KLIRING SKN / PEMBAYARAN TENDER PROYEK BUMN',
        cabang: '12001',
        tipe: 'CR',
        mutasiDebit: 0,
        mutasiKredit: 20000000,
        saldo: 118600000,
        barisAsli: 5
      },
      {
        id: 'tx-m-4',
        tanggal: '20/07/2024',
        keterangan: 'PEMBAYARAN LISTRIK PLN DAN INTERNET KANTOR BULANAN',
        cabang: '12001',
        tipe: 'DB',
        mutasiDebit: 4750000,
        mutasiKredit: 0,
        saldo: 113850000,
        barisAsli: 7
      },
      {
        id: 'tx-m-5',
        tanggal: '28/07/2024',
        keterangan: 'BIAYA ADM REKENING & BIAYA PENGELOLAAN BULANAN',
        cabang: '12001',
        tipe: 'DB',
        mutasiDebit: 8000000,
        mutasiKredit: 0,
        saldo: 105850000,
        barisAsli: 9
      },
      {
        id: 'tx-m-6',
        tanggal: '31/07/2024',
        keterangan: 'BIAYA ADMINISTRASI KARTU KREDIT CORPORATE',
        cabang: '12001',
        tipe: 'DB',
        mutasiDebit: 0,
        mutasiKredit: 0,
        saldo: 105850000,
        barisAsli: 11
      }
    ]
  },
  {
    id: 'sample-bri',
    bank: 'BRI',
    name: 'Rekening Koran BRI (BritAma)',
    description: 'Format BritAma Bisnis / Giro BRI dengan sandi transaksi, nomor referensi, dan saldo berjalan.',
    summary: {
      bankName: 'PT BANK RAKYAT INDONESIA (PERSERO) TBK',
      accountNumber: '0341-01-002819-50-8',
      accountHolder: 'TOKO MAKMUR REJEKI',
      period: '01/09/2024 - 15/09/2024',
      currency: 'IDR',
      saldoAwal: 15400000,
      totalDebit: 11200000,
      totalKredit: 24500000,
      saldoAkhir: 28700000,
      transactionCount: 5,
      isBalanced: true
    },
    transactions: [
      {
        id: 'tx-bri-1',
        tanggal: '02/09/2024',
        keterangan: 'SETORAN TUNAI TELLER KANCA JAKARTA KRAMAT / PENJUALAN TOKO AKHIR PEKAN',
        cabang: '0341',
        tipe: 'CR',
        mutasiDebit: 0,
        mutasiKredit: 14500000,
        saldo: 29900000,
        barisAsli: 1
      },
      {
        id: 'tx-bri-2',
        tanggal: '05/09/2024',
        keterangan: 'TRANSFER BRIMO KE BANK LAIN / PEMBELIAN STOK SEMBAKO GROSIR',
        cabang: '0341',
        tipe: 'DB',
        mutasiDebit: 9500000,
        mutasiKredit: 0,
        saldo: 20400000,
        barisAsli: 3
      },
      {
        id: 'tx-bri-3',
        tanggal: '08/09/2024',
        keterangan: 'TERIMA TRANSFER BRIVA / PEMBAYARAN SUPPLIER LANGGANAN',
        cabang: '0341',
        tipe: 'CR',
        mutasiDebit: 0,
        mutasiKredit: 10000000,
        saldo: 30400000,
        barisAsli: 5
      },
      {
        id: 'tx-bri-4',
        tanggal: '12/09/2024',
        keterangan: 'PENARIKAN TUNAI ATM BRI LINK PASAR SENEN',
        cabang: '0341',
        tipe: 'DB',
        mutasiDebit: 1500000,
        mutasiKredit: 0,
        saldo: 28900000,
        barisAsli: 7
      },
      {
        id: 'tx-bri-5',
        tanggal: '15/09/2024',
        keterangan: 'BIAYA PEMELIHARAAN KARTU ATM DAN BIAYA NOTIFIKASI SMS',
        cabang: '0341',
        tipe: 'DB',
        mutasiDebit: 200000,
        mutasiKredit: 0,
        saldo: 28700000,
        barisAsli: 9
      }
    ]
  }
];
