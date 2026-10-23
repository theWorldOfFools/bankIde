export const CURATED_IDEAS = {
  'SaaS Mikro': [
    {
      title: 'Invoice Radar',
      description: 'Invoice sederhana untuk freelancer dengan pengingat pembayaran berjenjang dan rekap piutang.',
      potential_score: 88,
    },
    {
      title: 'LanggananKu',
      description: 'Pengelola langganan SaaS untuk UMKM: pelanggan, paket, tagihan berulang, dan status pembayaran.',
      potential_score: 84,
    },
    {
      title: 'HR Lite',
      description: 'Absensi, cuti, dan slip gaji ringan untuk tim kecil tanpa implementasi HRIS yang berat.',
      potential_score: 79,
    },
    {
      title: 'FormUsaha',
      description: 'Form builder dengan alur approval dan ekspor data untuk kebutuhan operasional bisnis kecil.',
      potential_score: 81,
    },
  ],
  'E-commerce': [
    {
      title: 'Restock Radar',
      description: 'Prediksi stok kritis dan pengingat restock berdasarkan penjualan serta lead time supplier.',
      potential_score: 87,
    },
    {
      title: 'COD Shield',
      description: 'Skor risiko pesanan COD berdasarkan histori pembeli, wilayah, dan nilai transaksi.',
      potential_score: 83,
    },
    {
      title: 'UGC Studio',
      description: 'Kolaborasi konten pelanggan: pengumpulan materi, izin penggunaan, dan distribusi ke toko.',
      potential_score: 80,
    },
    {
      title: 'Bundling Engine',
      description: 'Rekomendasi paket produk dan harga bundling berbasis margin serta kecepatan perputaran stok.',
      potential_score: 77,
    },
  ],
  'AI & Produktivitas': [
    {
      title: 'Meeting to Action',
      description: 'Ubah transkrip rapat menjadi daftar tugas, pemilik, dan tenggat yang siap diekspor.',
      potential_score: 90,
    },
    {
      title: 'Dokumen Legal Assistant',
      description: 'Ringkas dan bandingkan dokumen kontrak untuk tim legal dan operasional UMKM.',
      potential_score: 85,
    },
    {
      title: 'Prompt Library',
      description: 'Perpustakaan prompt tim dengan versi, pengujian, dan pengukuran kualitas hasil.',
      potential_score: 78,
    },
    {
      title: 'Email Triage',
      description: 'Prioritaskan inbox, susun balasan awal, dan ubah email menjadi tugas terstruktur.',
      potential_score: 82,
    },
  ],
  'Keuangan Digital': [
    {
      title: 'Kas Harian UMKM',
      description: 'Pencatatan kas dan foto bukti transaksi yang otomatis membentuk laporan harian sederhana.',
      potential_score: 89,
    },
    {
      title: 'Pocket Bersama',
      description: 'Kas bersama untuk keluarga atau komunitas dengan batas pengeluaran dan approval.',
      potential_score: 80,
    },
    {
      title: 'Pajak Otomatis',
      description: 'Bantu UMKM menghitung dan menyiapkan dokumen pajak dari transaksi yang sudah tercatat.',
      potential_score: 86,
    },
    {
      title: 'Invoice Financing',
      description: 'Ajukan pembiayaan berbasis invoice dengan penilaian risiko dan pelacakan pembayaran.',
      potential_score: 75,
    },
  ],
  Pendidikan: [
    {
      title: 'Latihan Adaptif',
      description: 'Bank soal yang menyesuaikan tingkat kesulitan berdasarkan pola jawaban siswa.',
      potential_score: 86,
    },
    {
      title: 'Karier Kampus',
      description: 'Pemetaan minat, portofolio, dan jalur karier untuk mahasiswa tingkat akhir.',
      potential_score: 78,
    },
    {
      title: 'Microlearning Guru',
      description: 'Perpustakaan materi belajar singkat dan alat penilaian untuk guru sekolah dasar.',
      potential_score: 81,
    },
    {
      title: 'Ruang Orang Tua',
      description: 'Komunikasi terstruktur antara wali kelas dan orang tua tanpa grup chat yang berantakan.',
      potential_score: 74,
    },
  ],
  'UMKM & Logistik': [
    {
      title: 'Rute Kurir',
      description: 'Optimasi rute pengiriman harian untuk bisnis lokal dengan banyak titik antar.',
      potential_score: 84,
    },
    {
      title: 'Stok Warung',
      description: 'Pencatatan stok dan daftar belanja otomatis untuk warung dan toko kelontong.',
      potential_score: 82,
    },
    {
      title: 'PO Supplier',
      description: 'Kelola purchase order, kedatangan barang, dan selisih jumlah dalam satu alur.',
      potential_score: 79,
    },
    {
      title: 'Surplus Makanan',
      description: 'Hubungkan bisnis kuliner dengan pembeli untuk menjual stok makanan yang masih layak.',
      potential_score: 76,
    },
  ],
  Lainnya: [
    {
      title: 'Jurnal Kebiasaan',
      description: 'Pelacak kebiasaan ringan dengan refleksi mingguan dan grafik konsistensi.',
      potential_score: 73,
    },
    {
      title: 'Peta Komunitas',
      description: 'Direktori kegiatan dan komunitas lokal dengan pengingat acara dan pendaftaran sederhana.',
      potential_score: 72,
    },
    {
      title: 'Aset Tim',
      description: 'Inventaris perangkat dan aset tim dengan jadwal perawatan serta riwayat peminjaman.',
      potential_score: 70,
    },
    {
      title: 'Resep Terukur',
      description: 'Konversi resep, kebutuhan bahan, dan perhitungan HPP untuk bisnis makanan rumahan.',
      potential_score: 75,
    },
  ],
};

function findCategory(category) {
  const normalized = String(category).trim().toLowerCase();
  return Object.keys(CURATED_IDEAS).find(
    (key) => key.toLowerCase() === normalized
  ) || null;
}

export function selectCurated(category, count = 4) {
  const matchedCategory = findCategory(category);
  const specific = matchedCategory ? CURATED_IDEAS[matchedCategory] : [];
  const allIdeas = Object.values(CURATED_IDEAS).flat();
  const unique = new Map();

  for (const idea of [...specific, ...allIdeas]) {
    const key = idea.title.toLowerCase();
    if (!unique.has(key)) unique.set(key, idea);
  }

  return [...unique.values()].slice(0, Math.max(1, count)).map((idea) => ({
    ...idea,
  }));
}
