# BankIde

BankIde adalah PWA untuk menyimpan, mengelola, menjadwalkan, dan mengeksekusi ide proyek. Aplikasi berjalan sebagai satu layanan Express yang melayani API dan hasil build React, dengan PostgreSQL sebagai penyimpanan data.

## Fitur

- Login admin tunggal dengan cookie JWT httpOnly.
- Registrasi admin pertama terbuka hanya saat database belum memiliki admin; setelah akun pertama dibuat, registrasi ditutup.
- CRUD ide lengkap: judul, kategori, konteks, fitur V1, solusi, agency prompt, status, dan pengingat.
- Dashboard statistik, pipeline status, kategori teratas, dan pengingat aktif.
- Pencarian, filter kategori/status, tampilan tabel/kartu, dan paginasi.
- Import Excel `.xlsx`/`.xls` dengan validasi, deteksi duplikat, dan laporan per baris.
- Reminder email dan Web Push melalui outbox yang diproses cron setiap menit, dengan retry maksimal tiga kali.
- Rekomendasi ide dari AI opsional (API kompatibel OpenAI) atau kurasi lokal sebagai fallback.
- PWA dengan manifest, service worker, app shell offline, dan notifikasi push.

## Stack

- Frontend: React 19, Vite 6, Tailwind CSS 4, React Router 7, Lucide.
- Backend: Express 4, PostgreSQL, Zod, JWT, Multer, SheetJS, Nodemailer, Web Push.
- PWA: `vite-plugin-pwa` dengan strategi `injectManifest` dan Workbox.
- Scheduler: `node-cron`, zona waktu `Asia/Jakarta`.

## Prasyarat

- Node.js 24 dan npm 11.
- Docker + Docker Compose, atau PostgreSQL 16 yang sudah berjalan.
- HTTPS untuk instalasi PWA dan Web Push di perangkat nyata. `localhost` dikecualikan oleh browser.

## Menjalankan Secara Lokal

Langkah 3–4 membutuhkan Node.js dan npm di mesin lokal dan hanya untuk pengembangan. Server tanpa Node/npm cukup memakai jalur Docker di bawah.

1. Salin environment dan isi secret.

   ```bash
   cp .env.example .env
   openssl rand -hex 32
   ```

   Masukkan hasilnya ke `JWT_SECRET`, lalu ganti `ADMIN_PASSWORD` dengan minimal 12 karakter.

2. Jalankan PostgreSQL.

   ```bash
   docker compose up -d db
   ```

   Database lokal dipublikasikan di port `55432` agar tidak bentrok dengan PostgreSQL lain di port `5432`.

3. Pasang dependency dan siapkan database.

   ```bash
   npm install
   npm run db:init
   npm run seed:admin
   ```

4. Jalankan mode pengembangan.

   ```bash
   npm run dev
   ```

   UI tersedia di `http://localhost:5173`, API di `http://localhost:4100`. Vite mem-proxy `/api` ke server.

5. Untuk menguji hasil produksi secara lokal:

   ```bash
   npm run build
   npm start
   ```

   Buka `http://localhost:4100`. Express akan melayani build React dan API dari origin yang sama.

## Environment

| Variabel | Keterangan |
| --- | --- |
| `BANKIDE_PORT` | Port server lokal. Default kode `4000`; contoh memakai `4100`. |
| `PUBLIC_APP_URL` | Origin aplikasi untuk tautan email. Saat dev gunakan `http://localhost:5173`. |
| `BANKIDE_PUBLIC_APP_URL` | Origin aplikasi untuk Compose/Docker. Default `http://localhost:4100`. |
| `BANKIDE_HOST_PORT` | Port publik Compose di host. Default `4100`; tidak memakai port dev Vite `5173`. |
| `DATABASE_URL` | Koneksi PostgreSQL. Compose menimpa nilainya ke hostname `db`. |
| `DATABASE_SSL` | Set `true` untuk PostgreSQL yang mewajibkan SSL. |
| `JWT_SECRET` | Minimal 32 karakter. |
| `COOKIE_SECURE` | Set `true` saat produksi memakai HTTPS. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Kredensial yang dibuat oleh `seed:admin`. Password minimal 12 karakter. |
| `SMTP_*` | Konfigurasi email. Reminder email aktif jika `SMTP_HOST` dan `ADMIN_EMAIL` terisi. |
| `VAPID_*` | Kunci Web Push. Push aktif jika subject, public key, dan private key terisi. |
| `AI_API_KEY` / `AI_MODEL` | Mengaktifkan generate rekomendasi lewat AI. Jika kosong, fallback kurasi dipakai. |
| `AI_BASE_URL` | Base URL API kompatibel OpenAI. Default `https://api.openai.com/v1`. |

### Email

Isi `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, dan `SMTP_FROM`. Untuk pengujian lokal dapat memakai Mailpit:

```bash
docker run --rm -p 1025:1025 -p 8025:8025 axllent/mailpit
```

Lalu set `SMTP_HOST=127.0.0.1` dan `SMTP_PORT=1025`. Inbox uji tersedia di `http://localhost:8025`.

### Web Push

Buat pasangan kunci VAPID:

```bash
npx web-push generate-vapid-keys
```

Isi `VAPID_SUBJECT` dengan `mailto:` atau URL, lalu simpan public/private key pada `.env`. Buka aplikasi, login, dan tekan **Aktifkan notifikasi**. Web Push hanya dapat diuji pada HTTPS atau `localhost`.

## Import Excel

Gunakan sheet pertama. Baris pertama harus berupa header. Kolom yang dikenali:

- `title`, `judul`, `nama ide`, `nama proyek`
- `category`, `kategori`
- `context`, `konteks`, `latar belakang`, `deskripsi`, `tren & konteks di indonesia`
- `v1_features`, `v1 features`, `fitur v1`, `fitur`, `fitur v1 (yang diakomodir)`
- `solution`, `solusi`, `solusi (yang dibereskan)`
- `agency_prompt`, `agency prompt`, `prompt agensi`, `prompt`, `prompt untuk agency`
- `status`
- `reminder_at`, `reminder at`, `reminder`, `pengingat`, `tanggal pengingat`, `jadwal pengingat`

Aturan:

- Jika ada kolom `Prompt untuk Agency` dan `Prompt Detail Eksekusi`, keduanya digabung ke field prompt dengan pemisah baris kosong.
- Format `.xlsx` atau `.xls`, maksimal 5 MB dan 5.000 baris.
- Hanya `title`/`judul` yang wajib. Kategori kosong menjadi `Lainnya`.
- Status yang tidak dikenali menjadi `idea` dan dilaporkan sebagai warning.
- Duplikat ditentukan dari kombinasi `lower(title)` dan `category`, lalu dilewati.
- Tanggal tanpa offset dianggap WIB (`Asia/Jakarta`).

## Reminder

Saat ide dibuat atau diubah, server membuat job di tabel `reminder_deliveries` untuk setiap channel yang aktif. Cron berjalan setiap menit, mengambil job dengan `FOR UPDATE SKIP LOCKED`, mengirim email/push, lalu menandainya `sent`. Job yang gagal dicoba ulang dengan backoff sampai tiga attempt.

Perintah manual:

```bash
npm run reminder:once
```

## AI Opsional

Isi `AI_API_KEY` dan `AI_MODEL` untuk memakai API kompatibel OpenAI. `AI_BASE_URL` dapat diarahkan ke gateway lain. Tanpa konfigurasi AI, aplikasi memakai katalog kurasi lokal dan tetap dapat menyimpan rekomendasi sebagai ide.

## Docker (tanpa Node/npm di server)

Server hanya membutuhkan Docker dan Docker Compose. Dependency dan build React dijalankan di dalam image oleh `Dockerfile`; tidak ada `npm install`, `npm run build`, atau `npm run dev` yang dijalankan di host.

```bash
docker compose up -d --build
```

Service `init` berjalan sekali setiap deploy untuk menerapkan schema dan membuat admin dari `ADMIN_EMAIL`/`ADMIN_PASSWORD`; service `app` baru mulai setelah `init` selesai. Keduanya idempoten sehingga aman diulang, dan tidak perlu `exec` atau npm di server.

Aplikasi tersedia di `http://localhost:4100`. Ubah port host lewat `BANKIDE_HOST_PORT` (misalnya `8080`), dan sesuaikan `BANKIDE_PUBLIC_APP_URL` bila memakai domain/port lain. Build runtime hanya memasang dependency server; hasil build React disalin dari stage build. Untuk produksi, gunakan reverse proxy HTTPS, set `COOKIE_SECURE=true`, dan arahkan `BANKIDE_PUBLIC_APP_URL` ke domain publik.

## Scripts

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Jalankan API dan Vite secara bersamaan. |
| `npm run build` | Build PWA ke `client/dist`. |
| `npm start` | Jalankan Express yang juga melayani hasil build. |
| `npm run db:init` | Terapkan `server/db/schema.sql`. |
| `npm run seed:admin` | Buat atau perbarui admin dari environment. |
| `npm run reminder:once` | Proses outbox reminder sekali. |
| `npm run lint` | ESLint untuk client dan server. |

## Struktur

```text
client/                 React PWA
  public/               Manifest dan ikon
  src/components/       Shell, form, push toggle
  src/context/          Sesi admin
  src/lib/              API client, tanggal WIB, konstanta
  src/pages/            Login, dashboard, ide, rekomendasi
  src/sw.js             Service worker Workbox + push
server/
  db/schema.sql         Schema PostgreSQL
  src/jobs/             Cron reminder
  src/routes/           API
  src/scripts/          Init DB, seed, dispatch manual
  src/services/         Email, push, reminder, rekomendasi
```

## Verifikasi

```bash
npm run lint
npm run build
npm run reminder:once
```

Pengujian API dapat dilakukan dengan login ke `/api/auth/login`, lalu memakai cookie sesi untuk endpoint `/api/ideas`, `/api/dashboard`, `/api/import/ideas`, `/api/recommendations`, dan `/api/push`.
