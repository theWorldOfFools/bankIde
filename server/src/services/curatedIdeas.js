export const CURATED_IDEAS = {
  'SaaS Mikro': [
    {
      title: 'Invoice Radar',
      description: 'Invoice sederhana untuk freelancer dengan pengingat pembayaran berjenjang dan rekap piutang.',
      v1_features: '- Buat invoice dan kirim lewat email atau WhatsApp\n- Pengingat otomatis H-3, H+1, dan H+7\n- Rekap piutang dan status pembayaran\n- Ekspor invoice ke PDF',
      solution: 'Menggantikan pencatatan invoice manual dengan alur tagihan, pengingat berjenjang, dan rekap piutang sehingga pembayaran tidak terlewat.',
      agency_prompt: 'Bangun MVP web app Invoice Radar untuk freelancer Indonesia dengan autentikasi, data klien, pembuatan invoice PDF, pengiriman email, pengingat otomatis, dan dasbor piutang. Gunakan React, Express, PostgreSQL, dan Nodemailer. Selesai bila pengguna dapat membuat, mengirim, dan memantau status invoice beserta pengingatnya.',
      potential_score: 88,
    },
    {
      title: 'LanggananKu',
      description: 'Pengelola langganan SaaS untuk UMKM: pelanggan, paket, tagihan berulang, dan status pembayaran.',
      v1_features: '- Kelola pelanggan dan paket langganan\n- Tagihan berulang otomatis\n- Status pembayaran dan jatuh tempo\n- Notifikasi email atau WhatsApp',
      solution: 'Menyatukan data pelanggan, paket, dan tagihan berulang UMKM agar pendapatan langganan terpantau tanpa spreadsheet.',
      agency_prompt: 'Bangun MVP LanggananKu untuk UMKM dengan CRUD pelanggan, paket langganan, penjadwalan tagihan berulang, dan status pembayaran. Gunakan React, Express, PostgreSQL, dan cron untuk penagihan. Selesai bila tagihan berulang terbentuk otomatis dan pemilik usaha dapat melihat daftar jatuh tempo.',
      potential_score: 84,
    },
    {
      title: 'HR Lite',
      description: 'Absensi, cuti, dan slip gaji ringan untuk tim kecil tanpa implementasi HRIS yang berat.',
      v1_features: '- Absensi masuk dan pulang berbasis web\n- Pengajuan serta persetujuan cuti\n- Slip gaji sederhana\n- Rekap kehadiran bulanan',
      solution: 'Memberi tim kecil alat HR ringan untuk absensi, cuti, dan slip gaji tanpa biaya serta kompleksitas HRIS enterprise.',
      agency_prompt: 'Bangun MVP HR Lite dengan absensi harian, alur pengajuan dan persetujuan cuti, slip gaji, serta rekap bulanan. Gunakan React, Express, dan PostgreSQL. Selesai bila karyawan dapat absen dan mengajukan cuti, lalu admin dapat menyetujui dan mengunduh rekap.',
      potential_score: 79,
    },
    {
      title: 'FormUsaha',
      description: 'Form builder dengan alur approval dan ekspor data untuk kebutuhan operasional bisnis kecil.',
      v1_features: '- Form builder drag-and-drop\n- Alur approval berjenjang\n- Ekspor data ke CSV atau Excel\n- Berbagi form lewat tautan',
      solution: 'Memungkinkan bisnis kecil membuat formulir operasional dengan alur persetujuan dan ekspor data tanpa menulis kode.',
      agency_prompt: 'Bangun MVP FormUsaha dengan form builder sederhana, pengaturan alur approval, pengisian lewat tautan publik, dan ekspor CSV. Gunakan React, Express, dan PostgreSQL. Selesai bila admin dapat membuat form, menerima submission, dan mengekspor datanya.',
      potential_score: 81,
    },
  ],
  'E-commerce': [
    {
      title: 'Restock Radar',
      description: 'Prediksi stok kritis dan pengingat restock berdasarkan penjualan serta lead time supplier.',
      v1_features: '- Sinkronisasi stok dan data penjualan\n- Perhitungan lead time supplier\n- Alert stok kritis\n- Rekomendasi jumlah restock',
      solution: 'Mengubah data penjualan dan lead time supplier menjadi peringatan restock yang dapat ditindaklanjuti agar stok tidak kosong atau menumpuk.',
      agency_prompt: 'Bangun MVP Restock Radar dengan impor stok dan penjualan, pengaturan lead time supplier, alert stok kritis, dan rekomendasi restock. Gunakan React, Express, dan PostgreSQL. Selesai bila sistem menampilkan daftar produk yang perlu direstock beserta jumlah sarannya.',
      potential_score: 87,
    },
    {
      title: 'COD Shield',
      description: 'Skor risiko pesanan COD berdasarkan histori pembeli, wilayah, dan nilai transaksi.',
      v1_features: '- Impor pesanan COD\n- Skor risiko per pesanan\n- Daftar pesanan berisiko tinggi\n- Rekomendasi langkah verifikasi',
      solution: 'Menilai risiko pesanan COD dari histori pembeli, wilayah, dan nilai transaksi untuk menekan paket gagal antar.',
      agency_prompt: 'Bangun MVP COD Shield dengan impor pesanan, aturan skor risiko, daftar pesanan prioritas verifikasi, dan ringkasan hasil. Gunakan React, Express, dan PostgreSQL. Selesai bila setiap pesanan mendapat skor dan admin dapat menandai tindakan verifikasi.',
      potential_score: 83,
    },
    {
      title: 'UGC Studio',
      description: 'Kolaborasi konten pelanggan: pengumpulan materi, izin penggunaan, dan distribusi ke toko.',
      v1_features: '- Kampanye pengumpulan konten pelanggan\n- Unggah dan moderasi materi\n- Persetujuan izin penggunaan\n- Distribusi ke kanal toko',
      solution: 'Menyederhanakan pengelolaan konten buatan pelanggan dari pengumpulan, izin, hingga publikasi agar merek konsisten dan aman secara legal.',
      agency_prompt: 'Bangun MVP UGC Studio dengan kampanye, formulir unggah konten, moderasi, persetujuan izin, dan status publikasi. Gunakan React, Express, PostgreSQL, dan object storage. Selesai bila tim dapat mengumpulkan konten, menyetujui izin, dan menandai konten siap dipakai.',
      potential_score: 80,
    },
    {
      title: 'Bundling Engine',
      description: 'Rekomendasi paket produk dan harga bundling berbasis margin serta kecepatan perputaran stok.',
      v1_features: '- Analisis margin dan perputaran stok\n- Rekomendasi paket bundling\n- Simulasi harga dan diskon\n- Ekspor paket ke katalog',
      solution: 'Membantu toko menyusun bundling berdasarkan margin dan kecepatan penjualan untuk menaikkan nilai transaksi tanpa merusak profitabilitas.',
      agency_prompt: 'Bangun MVP Bundling Engine dengan impor produk, perhitungan margin, simulasi harga bundling, dan rekomendasi paket. Gunakan React, Express, dan PostgreSQL. Selesai bila pengguna dapat membuat bundling dengan estimasi margin dan mengekspornya.',
      potential_score: 77,
    },
  ],
  'AI & Produktivitas': [
    {
      title: 'Meeting to Action',
      description: 'Ubah transkrip rapat menjadi daftar tugas, pemilik, dan tenggat yang siap diekspor.',
      v1_features: '- Unggah transkrip atau rekaman rapat\n- Ekstraksi keputusan, tugas, pemilik, dan tenggat\n- Sinkronisasi ke daftar tugas atau kalender\n- Ringkasan rapat',
      solution: 'Mengubah transkrip rapat menjadi daftar tindakan yang jelas sehingga keputusan tidak hilang dan follow-up dapat dipantau.',
      agency_prompt: 'Bangun MVP Meeting to Action dengan unggah transkrip, ekstraksi tugas dan pemilik menggunakan LLM, serta ekspor ke format to-do. Gunakan React, Express, PostgreSQL, dan API model bahasa. Selesai bila transkrip menghasilkan daftar tugas terstruktur yang dapat diedit dan diekspor.',
      potential_score: 90,
    },
    {
      title: 'Dokumen Legal Assistant',
      description: 'Ringkas dan bandingkan dokumen kontrak untuk tim legal dan operasional UMKM.',
      v1_features: '- Unggah dan parsing kontrak PDF\n- Ringkasan klausul penting\n- Perbandingan dua versi kontrak\n- Penanda risiko dan istilah kunci',
      solution: 'Mempercepat review kontrak UMKM dengan ringkasan dan perbandingan klausul otomatis sehingga tim legal fokus pada risiko utama.',
      agency_prompt: 'Bangun MVP Dokumen Legal Assistant dengan unggah PDF, ekstraksi teks, ringkasan klausul, perbandingan versi, dan penanda risiko. Gunakan React, Express, PostgreSQL, dan API model bahasa. Selesai bila pengguna dapat mengunggah dua kontrak dan melihat perbedaan klausul pentingnya.',
      potential_score: 85,
    },
    {
      title: 'Prompt Library',
      description: 'Perpustakaan prompt tim dengan versi, pengujian, dan pengukuran kualitas hasil.',
      v1_features: '- Simpan dan kategorikan prompt\n- Versioning dan riwayat perubahan\n- Uji prompt dengan model\n- Penilaian kualitas hasil',
      solution: 'Menjadi sumber terpusat prompt tim dengan versi dan pengujian agar hasil AI konsisten serta mudah diaudit.',
      agency_prompt: 'Bangun MVP Prompt Library dengan CRUD prompt, versioning, pengujian ke model, dan pencatatan hasil. Gunakan React, Express, dan PostgreSQL. Selesai bila tim dapat menyimpan prompt, membandingkan versi, dan mencatat kualitas output.',
      potential_score: 78,
    },
    {
      title: 'Email Triage',
      description: 'Prioritaskan inbox, susun balasan awal, dan ubah email menjadi tugas terstruktur.',
      v1_features: '- Koneksi inbox email\n- Klasifikasi prioritas dan kategori\n- Draf balasan otomatis\n- Ubah email menjadi tugas',
      solution: 'Mengurangi beban inbox dengan memprioritaskan email penting, menyiapkan draf balasan, dan mengubah permintaan menjadi tugas.',
      agency_prompt: 'Bangun MVP Email Triage dengan sinkronisasi inbox, klasifikasi prioritas, draf balasan, dan konversi email menjadi tugas. Gunakan React, Express, PostgreSQL, dan API model bahasa. Selesai bila email masuk terklasifikasi dan pengguna dapat menyetujui draf balasan atau membuat tugas.',
      potential_score: 82,
    },
  ],
  'Keuangan Digital': [
    {
      title: 'Kas Harian UMKM',
      description: 'Pencatatan kas dan foto bukti transaksi yang otomatis membentuk laporan harian sederhana.',
      v1_features: '- Catat pemasukan dan pengeluaran\n- Foto bukti transaksi\n- Laporan harian dan bulanan\n- Kategori dan pencarian transaksi',
      solution: 'Membantu UMKM mencatat kas harian dengan bukti foto dan laporan otomatis agar arus kas selalu terpantau.',
      agency_prompt: 'Bangun MVP Kas Harian UMKM dengan pencatatan transaksi, unggah bukti, kategori, serta laporan harian dan bulanan. Gunakan React, Express, PostgreSQL, dan object storage. Selesai bila pengguna dapat mencatat transaksi, melampirkan bukti, dan melihat rekap periode.',
      potential_score: 89,
    },
    {
      title: 'Pocket Bersama',
      description: 'Kas bersama untuk keluarga atau komunitas dengan batas pengeluaran dan approval.',
      v1_features: '- Buat dompet bersama\n- Setor dan tarik dana\n- Batas pengeluaran dan approval\n- Riwayat transaksi transparan',
      solution: 'Memberi keluarga atau komunitas dompet bersama dengan kontrol pengeluaran dan persetujuan agar dana kolektif aman dan transparan.',
      agency_prompt: 'Bangun MVP Pocket Bersama dengan pembuatan dompet, pencatatan setoran dan penarikan, batas pengeluaran, serta alur approval. Gunakan React, Express, dan PostgreSQL. Selesai bila anggota dapat bertransaksi dan setiap pengeluaran di atas batas memerlukan persetujuan.',
      potential_score: 80,
    },
    {
      title: 'Pajak Otomatis',
      description: 'Bantu UMKM menghitung dan menyiapkan dokumen pajak dari transaksi yang sudah tercatat.',
      v1_features: '- Impor transaksi usaha\n- Hitung estimasi pajak\n- Checklist dokumen pajak\n- Ekspor laporan siap lapor',
      solution: 'Menyederhanakan kewajiban pajak UMKM dengan perhitungan otomatis dan checklist dokumen dari transaksi yang sudah tercatat.',
      agency_prompt: 'Bangun MVP Pajak Otomatis dengan impor transaksi, kalkulasi estimasi pajak, checklist dokumen, dan ekspor laporan. Gunakan React, Express, dan PostgreSQL. Selesai bila pengguna memperoleh estimasi pajak dan daftar dokumen yang perlu disiapkan.',
      potential_score: 86,
    },
    {
      title: 'Invoice Financing',
      description: 'Ajukan pembiayaan berbasis invoice dengan penilaian risiko dan pelacakan pembayaran.',
      v1_features: '- Unggah invoice dan data pembeli\n- Skor risiko pembiayaan\n- Pengajuan plafon\n- Pelacakan pembayaran dan jatuh tempo',
      solution: 'Membuka akses pembiayaan berbasis invoice dengan penilaian risiko dan pelacakan pembayaran bagi usaha yang kekurangan arus kas.',
      agency_prompt: 'Bangun MVP Invoice Financing dengan unggah invoice, penilaian risiko sederhana, pengajuan plafon, dan pelacakan pembayaran. Gunakan React, Express, dan PostgreSQL. Selesai bila pengguna dapat mengajukan invoice dan melihat status serta skor risikonya.',
      potential_score: 75,
    },
  ],
  Pendidikan: [
    {
      title: 'Latihan Adaptif',
      description: 'Bank soal yang menyesuaikan tingkat kesulitan berdasarkan pola jawaban siswa.',
      v1_features: '- Bank soal per mata pelajaran\n- Penyesuaian tingkat kesulitan\n- Analisis jawaban dan rekomendasi latihan\n- Dasbor progres siswa',
      solution: 'Membantu siswa berlatih pada tingkat yang tepat melalui soal adaptif dan analisis kelemahan.',
      agency_prompt: 'Bangun MVP Latihan Adaptif dengan bank soal, pemilihan soal berdasarkan performa, analisis jawaban, dan dasbor progres. Gunakan React, Express, dan PostgreSQL. Selesai bila tingkat kesulitan menyesuaikan jawaban siswa dan progres terlihat di dasbor.',
      potential_score: 86,
    },
    {
      title: 'Karier Kampus',
      description: 'Pemetaan minat, portofolio, dan jalur karier untuk mahasiswa tingkat akhir.',
      v1_features: '- Asesmen minat dan keterampilan\n- Portofolio mahasiswa\n- Rekomendasi jalur karier\n- Daftar lowongan dan magang',
      solution: 'Menghubungkan minat, portofolio, dan peluang karier mahasiswa tingkat akhir dalam satu alur yang terarah.',
      agency_prompt: 'Bangun MVP Karier Kampus dengan asesmen minat, portofolio, rekomendasi jalur karier, dan daftar lowongan. Gunakan React, Express, dan PostgreSQL. Selesai bila mahasiswa mendapat rekomendasi karier berdasarkan profil dan dapat melamar dari daftar yang tersedia.',
      potential_score: 78,
    },
    {
      title: 'Microlearning Guru',
      description: 'Perpustakaan materi belajar singkat dan alat penilaian untuk guru sekolah dasar.',
      v1_features: '- Perpustakaan materi belajar singkat\n- Pembuatan kuis dan penilaian\n- Penugasan ke kelas\n- Rekap hasil siswa',
      solution: 'Membantu guru sekolah dasar menyiapkan materi singkat dan penilaian dengan cepat tanpa alat yang rumit.',
      agency_prompt: 'Bangun MVP Microlearning Guru dengan perpustakaan materi, pembuatan kuis, penugasan kelas, dan rekap nilai. Gunakan React, Express, dan PostgreSQL. Selesai bila guru dapat membuat kuis, menugaskannya, dan melihat hasil siswa.',
      potential_score: 81,
    },
    {
      title: 'Ruang Orang Tua',
      description: 'Komunikasi terstruktur antara wali kelas dan orang tua tanpa grup chat yang berantakan.',
      v1_features: '- Pengumuman wali kelas\n- Pesan terstruktur per topik\n- Jadwal dan pengingat acara\n- Rekap kehadiran orang tua',
      solution: 'Menggantikan grup chat yang berantakan dengan kanal komunikasi terstruktur antara wali kelas dan orang tua.',
      agency_prompt: 'Bangun MVP Ruang Orang Tua dengan pengumuman, pesan per topik, jadwal acara, dan rekap kehadiran. Gunakan React, Express, dan PostgreSQL. Selesai bila wali kelas dapat mengirim pengumuman dan orang tua menerima notifikasi serta konfirmasi kehadiran.',
      potential_score: 74,
    },
  ],
  'UMKM & Logistik': [
    {
      title: 'Rute Kurir',
      description: 'Optimasi rute pengiriman harian untuk bisnis lokal dengan banyak titik antar.',
      v1_features: '- Impor daftar antar\n- Optimasi urutan rute\n- Navigasi ke titik antar\n- Bukti pengiriman dan status',
      solution: 'Mengoptimalkan rute kurir harian agar biaya dan waktu antar berkurang, terutama untuk bisnis dengan banyak titik.',
      agency_prompt: 'Bangun MVP Rute Kurir dengan impor titik antar, optimasi urutan rute, status pengiriman, dan bukti serah terima. Gunakan React, Express, PostgreSQL, dan API peta. Selesai bila kurir mendapat urutan rute yang lebih efisien dan dapat memperbarui status.',
      potential_score: 84,
    },
    {
      title: 'Stok Warung',
      description: 'Pencatatan stok dan daftar belanja otomatis untuk warung dan toko kelontong.',
      v1_features: '- Catat stok masuk dan keluar\n- Daftar belanja otomatis\n- Peringatan stok minimum\n- Laporan penjualan sederhana',
      solution: 'Memberi warung cara cepat mencatat stok dan menyusun daftar belanja sehingga barang penting tidak habis.',
      agency_prompt: 'Bangun MVP Stok Warung dengan pencatatan stok masuk dan keluar, ambang minimum, daftar belanja otomatis, dan laporan penjualan. Gunakan React, Express, dan PostgreSQL. Selesai bila warung mendapat peringatan stok minimum dan daftar belanja yang dapat dicetak.',
      potential_score: 82,
    },
    {
      title: 'PO Supplier',
      description: 'Kelola purchase order, kedatangan barang, dan selisih jumlah dalam satu alur.',
      v1_features: '- Buat purchase order\n- Pantau kedatangan barang\n- Catat selisih jumlah dan harga\n- Riwayat supplier',
      solution: 'Menyatukan proses purchase order, penerimaan barang, dan rekonsiliasi selisih agar pengadaan lebih rapi.',
      agency_prompt: 'Bangun MVP PO Supplier dengan pembuatan purchase order, penerimaan barang, pencatatan selisih, dan riwayat supplier. Gunakan React, Express, dan PostgreSQL. Selesai bila pengguna dapat membuat PO, menandai kedatangan, dan melihat selisih terhadap pesanan.',
      potential_score: 79,
    },
    {
      title: 'Surplus Makanan',
      description: 'Hubungkan bisnis kuliner dengan pembeli untuk menjual stok makanan yang masih layak.',
      v1_features: '- Pasang stok surplus dengan diskon\n- Pemesanan dan pembayaran\n- Penjadwalan pengambilan\n- Riwayat transaksi penjual',
      solution: 'Membantu bisnis kuliner menjual stok makanan layak yang tersisa dan mengurangi food waste.',
      agency_prompt: 'Bangun MVP Surplus Makanan dengan unggah stok surplus, katalog diskon, pemesanan, pembayaran, dan jadwal pengambilan. Gunakan React, Express, dan PostgreSQL. Selesai bila penjual dapat memasang surplus dan pembeli dapat memesan serta memilih waktu pengambilan.',
      potential_score: 76,
    },
  ],
  Lainnya: [
    {
      title: 'Jurnal Kebiasaan',
      description: 'Pelacak kebiasaan ringan dengan refleksi mingguan dan grafik konsistensi.',
      v1_features: '- Buat dan jadwalkan kebiasaan\n- Checklist harian\n- Refleksi mingguan\n- Grafik konsistensi',
      solution: 'Membantu pengguna membangun kebiasaan melalui pencatatan ringan, refleksi, dan visualisasi konsistensi.',
      agency_prompt: 'Bangun MVP Jurnal Kebiasaan dengan pembuatan kebiasaan, checklist harian, refleksi mingguan, dan grafik konsistensi. Gunakan React, Express, dan PostgreSQL. Selesai bila pengguna dapat mencatat kebiasaan setiap hari dan melihat tren konsistensinya.',
      potential_score: 73,
    },
    {
      title: 'Peta Komunitas',
      description: 'Direktori kegiatan dan komunitas lokal dengan pengingat acara dan pendaftaran sederhana.',
      v1_features: '- Direktori komunitas dan kegiatan\n- Peta lokasi acara\n- Pendaftaran peserta\n- Pengingat acara',
      solution: 'Memudahkan orang menemukan dan mengikuti kegiatan komunitas lokal dalam satu direktori dengan pendaftaran dan pengingat.',
      agency_prompt: 'Bangun MVP Peta Komunitas dengan direktori kegiatan, peta lokasi, pendaftaran peserta, dan pengingat acara. Gunakan React, Express, PostgreSQL, dan API peta. Selesai bila pengguna dapat menemukan acara terdekat, mendaftar, dan menerima pengingat.',
      potential_score: 72,
    },
    {
      title: 'Aset Tim',
      description: 'Inventaris perangkat dan aset tim dengan jadwal perawatan serta riwayat peminjaman.',
      v1_features: '- Inventaris perangkat dan aset\n- Jadwal perawatan\n- Peminjaman dan pengembalian\n- Riwayat penggunaan',
      solution: 'Memberi tim visibilitas penuh atas aset dan perangkat, termasuk perawatan dan peminjaman, agar tidak hilang atau rusak tanpa jejak.',
      agency_prompt: 'Bangun MVP Aset Tim dengan inventaris aset, jadwal perawatan, alur peminjaman dan pengembalian, serta riwayat penggunaan. Gunakan React, Express, dan PostgreSQL. Selesai bila tim dapat mencatat aset, meminjamkannya, dan melihat jadwal perawatan.',
      potential_score: 70,
    },
    {
      title: 'Resep Terukur',
      description: 'Konversi resep, kebutuhan bahan, dan perhitungan HPP untuk bisnis makanan rumahan.',
      v1_features: '- Konversi porsi resep\n- Daftar kebutuhan bahan\n- Perhitungan HPP\n- Ekspor daftar belanja',
      solution: 'Membantu bisnis makanan rumahan mengonversi resep, menghitung kebutuhan bahan, dan menetapkan HPP secara akurat.',
      agency_prompt: 'Bangun MVP Resep Terukur dengan penyimpanan resep, konversi porsi, perhitungan kebutuhan bahan dan HPP, serta ekspor daftar belanja. Gunakan React, Express, dan PostgreSQL. Selesai bila pengguna dapat mengubah porsi dan memperoleh kebutuhan bahan serta HPP yang diperbarui.',
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

export function findCuratedIdea(title, category) {
  const target = String(title).trim().toLowerCase();
  const matchedCategory = findCategory(category);
  const specific = matchedCategory ? CURATED_IDEAS[matchedCategory] : [];
  const allIdeas = Object.values(CURATED_IDEAS).flat();

  return [...specific, ...allIdeas].find(
    (idea) => idea.title.trim().toLowerCase() === target
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
