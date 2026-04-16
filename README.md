💇 Totalook — Salon Booking Chatbot

Dokumentasi Proyek — MCP-Totalook

---

## 📋 Deskripsi Proyek

Totalook adalah aplikasi chatbot asisten virtual untuk salon kecantikan.  
Dikembangkan menggunakan TypeScript dan Model Context Protocol (MCP).

Aplikasi ini membantu pelanggan untuk:
- Melihat layanan salon
- Mengecek ketersediaan jadwal
- Melakukan booking secara praktis melalui chat

---

## 👥 Tim & Pembagian Tugas

### 🌸 Fara — Perencanaan Tools
- Merancang daftar tools (get_layanan, buat_booking, dll)
- Menentukan parameter input & output
- Menyusun alur chatbot
- Menentukan aturan bisnis

### 💻 Yoan — Setup Environment
- Instalasi Node.js (v18+)
- Setup Ollama & model
- Konfigurasi `.env`
- Setup TypeScript & dependencies
- Membuat frontend chat (`index.html`)

### 📊 Excll — Data Dummy & JSON
- Membuat `layanan.json` (12 layanan)
- Membuat `jadwal.json`
- Membuat `booking.json`
- Menyesuaikan struktur data dengan TypeScript

### 🖥️ Nabil — MCP Server & Frontend
- Implementasi MCP Server (6 tools)
- Membangun REST API (Express.js)
- Integrasi Ollama
- Integrasi end-to-end system

---

## 📁 Struktur Proyek

.
├── frontend/
│   └── index.html
│
├── server/
│   ├── app.ts
│   ├── mcp-server.ts
│   │
│   ├── data/
│   │   ├── layanan.json
│   │   ├── jadwal.json
│   │   └── booking.json
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
└── README.md


---

## ✨ Fitur Utama

- Chatbot virtual **Tola**
- Daftar layanan + harga + durasi
- Cek jadwal real-time
- Booking otomatis dengan validasi
- Cek status booking
- Riwayat booking via nomor HP
- Pembatalan booking

---

## 💆 Daftar Layanan

| ID   | Nama Layanan            | Harga      | Durasi  | Kategori   |
|------|------------------------|-----------|--------|-----------|
| L001 | Potong Rambut Wanita   | Rp 75.000 | 45 menit | Potong |
| L002 | Potong Rambut Pria     | Rp 50.000 | 30 menit | Potong |
| L003 | Creambath              | Rp 120.000 | 60 menit | Perawatan |
| L004 | Cat Rambut             | Rp 200.000 | 90 menit | Warna |
| L005 | Keriting Permanen      | Rp 250.000 | 120 menit | Styling |
| L006 | Smoothing              | Rp 300.000 | 150 menit | Styling |
| L007 | Hair Mask              | Rp 85.000 | 45 menit | Perawatan |
| L008 | Cuci & Blow Dry        | Rp 40.000 | 30 menit | Dasar |
| L009 | Hair Spa               | Rp 120.000 | 60 menit | Perawatan |
| L010 | Facial                 | Rp 150.000 | 60 menit | Wajah |
| L011 | Manicure               | Rp 75.000 | 30 menit | Kuku |
| L012 | Pedicure               | Rp 80.000 | 30 menit | Kuku |

---

## 🕐 Jam Operasional

| Hari           | Jam |
|----------------|-----|
| Senin – Jumat  | 09:00 – 16:00 |
| Sabtu          | 09:00 – 17:00 |
| Minggu         | Tutup |

---

## 🚀 Cara Menjalankan

### Prasyarat
- Node.js >= 18
- npm
- Ollama aktif

### Instalasi

```bash
cd server
npm install
npm run dev

Server berjalan di:
http://localhost:3000

📡 Endpoint API

Method	Endpoint	Fungsi
GET	/layanan	Ambil semua layanan
POST	/booking	Buat booking
GET	/status/:booking_id	Cek status booking
GET	/jadwal	Cek jadwal
POST	/chat	Chat dengan Tola

🤖 MCP Tools

Tool	Fungsi
get_layanan	Ambil layanan
buat_booking	Buat booking
cek_jadwal_tersedia	Cek slot waktu
cek_status_booking	Cek status
cek_booking_by_hp	Cari booking
batalkan_booking	Batalkan booking

⚙️ Teknologi

Teknologi	Kegunaan
Node.js	Runtime
TypeScript	Type safety
Express.js	Server
Ollama	LLM lokal
MCP SDK	Tool calling
Zod	Validasi
tsx	Dev runner

📂 Contoh Data Booking

{
  "booking_id": "BK001",
  "nama_pelanggan": "Siti Rahma",
  "no_hp": "081234567890",
  "layanan_id": "L001",
  "tanggal": "2026-04-20",
  "jam": "10:00",
  "status": "Terkonfirmasi"
}

📌 Status Booking

Terkonfirmasi → Booking aktif
Selesai → Layanan selesai
Dibatalkan → Booking dibatalkan

 📄 Catatan

Aplikasi ini dikembangkan untuk kebutuhan internal salon Totalook.  
Meskipun belum ditujukan untuk skala produksi, sistem telah dirancang dengan struktur yang jelas dan fungsional.
Data pada aplikasi saat ini masih disimpan secara lokal dalam format JSON.  
Untuk pengembangan lebih lanjut dan penggunaan dalam skala produksi, disarankan untuk menggunakan sistem database yang lebih robust seperti:
- PostgreSQL
- MongoDB