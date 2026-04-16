import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";

// ============================================================
// 📦 LOAD DATA dari file JSON (Fase 3)
// ============================================================

const dataPath = path.join(process.cwd(), "data");

function loadJSON(filename: string) {
  const filePath = path.join(dataPath, filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

// ============================================================
// 🗂️ INTERFACE / TYPE DEFINITIONS
// ============================================================

interface Layanan {
  id: string;
  nama: string;
  harga: number;
  durasi: number; // dalam menit
  kategori: "Rambut" | "Wajah" | "Kuku";
  deskripsi: string;
}

interface Booking {
  booking_id: string;
  nama_pelanggan: string;
  no_hp: string;
  layanan_id: string;
  layanan_nama: string; // snapshot nama layanan untuk kemudahan tampilan
  tanggal: string; // format: YYYY-MM-DD
  jam: string; // format: HH:MM
  status: "Terkonfirmasi" | "Selesai" | "Dibatalkan";
  total_harga: number;
  estimasi_selesai: string; // format: HH:MM
}

interface SlotJadwal {
  hari: string;
  jam_tersedia: string[];
}

// ============================================================
// 🖥️ INISIALISASI MCP SERVER
// ============================================================

const server = new McpServer({
  name: "totalook-mcp-server",
  version: "1.0.0",
});

// ============================================================
// 🛠️ TOOL 1 — get_layanan()
// Mengambil semua layanan salon atau filter by kategori
// ============================================================

server.tool(
  "get_layanan",
  "Mengambil daftar layanan salon Totalook. Bisa difilter berdasarkan kategori: Rambut, Wajah, atau Kuku.",
  {
    kategori: z
      .enum(["Rambut", "Wajah", "Kuku", "Semua"])
      .optional()
      .default("Semua")
      .describe("Filter kategori layanan. Default: Semua"),
  },
  async ({ kategori }) => {
    const layananList: Layanan[] = loadJSON("layanan.json");

    const hasil =
      kategori === "Semua"
        ? layananList
        : layananList.filter((l) => l.kategori === kategori);

    if (hasil.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `Tidak ada layanan dengan kategori "${kategori}".`,
          },
        ],
      };
    }

    const teks = hasil
      .map(
        (l) =>
          `• [${l.id}] ${l.nama}\n` +
          `  Harga: Rp ${l.harga.toLocaleString("id-ID")}\n` +
          `  Durasi: ${l.durasi} menit\n` +
          `  Kategori: ${l.kategori}\n` +
          `  Deskripsi: ${l.deskripsi}`
      )
      .join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `🌸 Daftar Layanan Salon Totalook (${kategori}):\n\n${teks}`,
        },
      ],
    };
  }
);

// ============================================================
// 🛠️ TOOL 2 — buat_booking()
// Membuat booking layanan salon baru
// ============================================================

server.tool(
  "buat_booking",
  "Membuat booking/reservasi layanan salon baru untuk pelanggan.",
  {
    nama_pelanggan: z.string().min(2).describe("Nama lengkap pelanggan"),
    no_hp: z.string().min(10).describe("Nomor HP pelanggan"),
    layanan_id: z.string().describe("ID layanan yang dipilih (contoh: L001)"),
    tanggal: z.string().describe("Tanggal booking format YYYY-MM-DD"),
    jam: z.string().describe("Jam booking format HH:MM"),
  },
  async ({ nama_pelanggan, no_hp, layanan_id, tanggal, jam }) => {
    const layananList: Layanan[] = loadJSON("layanan.json");
    const bookingList: Booking[] = loadJSON("booking.json");

    // Cek apakah layanan tersedia
    const layanan = layananList.find((l) => l.id === layanan_id);
    if (!layanan) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Layanan dengan ID "${layanan_id}" tidak ditemukan. Gunakan tool get_layanan() untuk melihat daftar layanan.`,
          },
        ],
      };
    }

    // Cek apakah slot sudah penuh
    const konflik = bookingList.find(
      (b) =>
        b.tanggal === tanggal &&
        b.jam === jam &&
        b.layanan_id === layanan_id &&
        b.status !== "Dibatalkan"
    );
    if (konflik) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Jadwal ${tanggal} pukul ${jam} untuk layanan ${layanan.nama} sudah penuh. Silakan pilih jam lain.`,
          },
        ],
      };
    }

    // Hitung estimasi selesai
    const [jamInt, menitInt] = jam.split(":").map(Number);
    const totalMenit = jamInt * 60 + menitInt + layanan.durasi;
    const jamSelesai = Math.floor(totalMenit / 60)
      .toString()
      .padStart(2, "0");
    const menitSelesai = (totalMenit % 60).toString().padStart(2, "0");
    const estimasi = `${jamSelesai}:${menitSelesai}`;

    // Buat booking ID baru
    const allIds = bookingList.map((b) => parseInt(b.booking_id.replace("BK", "")) || 0);
    const lastId = allIds.length > 0 ? Math.max(...allIds) : 0;
    const newId = `BK${String(lastId + 1).padStart(3, "0")}`;

    // Simpan booking baru
    const bookingBaru: Booking = {
      booking_id: newId,
      nama_pelanggan,
      no_hp,
      layanan_id,
      layanan_nama: layanan.nama,
      tanggal,
      jam,
      status: "Terkonfirmasi",
      total_harga: layanan.harga,
      estimasi_selesai: estimasi,
    };

    bookingList.push(bookingBaru);
    fs.writeFileSync(
      path.join(dataPath, "booking.json"),
      JSON.stringify(bookingList, null, 2)
    );

    return {
      content: [
        {
          type: "text",
          text:
            `✅ Booking Berhasil Dibuat!\n\n` +
            `📋 ID Booking   : ${newId}\n` +
            `👤 Nama         : ${nama_pelanggan}\n` +
            `📞 No HP        : ${no_hp}\n` +
            `💆 Layanan      : ${layanan.nama}\n` +
            `📅 Tanggal      : ${tanggal}\n` +
            `🕐 Jam Mulai    : ${jam}\n` +
            `🕑 Estimasi Selesai : ${estimasi}\n` +
            `💰 Total Harga  : Rp ${layanan.harga.toLocaleString("id-ID")}\n` +
            `📌 Status       : Terkonfirmasi\n\n` +
            `Terima kasih telah booking di Totalook! 🌸`,
        },
      ],
    };
  }
);

// ============================================================
// 🛠️ TOOL 3 — cek_jadwal_tersedia()
// Mengecek slot waktu yang masih kosong
// ============================================================

server.tool(
  "cek_jadwal_tersedia",
  "Mengecek jadwal/slot waktu yang masih tersedia untuk layanan tertentu pada tanggal tertentu.",
  {
    tanggal: z.string().describe("Tanggal yang ingin dicek format YYYY-MM-DD"),
    layanan_id: z.string().describe("ID layanan yang dipilih (contoh: L001)"),
  },
  async ({ tanggal, layanan_id }) => {
    const layananList: Layanan[] = loadJSON("layanan.json");
    const bookingList: Booking[] = loadJSON("booking.json");
    const jadwalList: SlotJadwal[] = loadJSON("jadwal.json");

    // Validasi layanan
    const layanan = layananList.find((l) => l.id === layanan_id);
    if (!layanan) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Layanan ID "${layanan_id}" tidak ditemukan.`,
          },
        ],
      };
    }

    // Ambil semua jam booking yang sudah ada pada tanggal & layanan ini
    const jamSudahDipakai = bookingList
      .filter(
        (b) =>
          b.tanggal === tanggal &&
          b.layanan_id === layanan_id &&
          b.status !== "Dibatalkan"
      )
      .map((b) => b.jam);

    // Ambil semua jam yang tersedia dari jadwal.json
    const [y, m, d] = tanggal.split("-").map(Number);
    const hariIndex = new Date(tanggal).getDay(); // 0=Minggu, 1=Senin, ...
    const namaHari = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"][hariIndex];
    const jadwalHari = jadwalList.find((j) => j.hari === namaHari);

    if (!jadwalHari) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Salon tutup pada hari ${namaHari}.`,
          },
        ],
      };
    }

    const jamTersedia = jadwalHari.jam_tersedia.filter(
      (jam) => !jamSudahDipakai.includes(jam)
    );

    if (jamTersedia.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `😔 Semua jadwal untuk ${layanan.nama} pada ${tanggal} (${namaHari}) sudah penuh. Coba tanggal lain.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text:
            `📅 Jadwal Tersedia untuk ${layanan.nama}\n` +
            `Tanggal: ${tanggal} (${namaHari})\n\n` +
            `Jam yang masih tersedia:\n` +
            jamTersedia.map((j) => `  ✅ ${j}`).join("\n") +
            `\n\nSilakan pilih jam dan lakukan booking dengan tool buat_booking().`,
        },
      ],
    };
  }
);

// ============================================================
// 🛠️ TOOL 4 — cek_status_booking()
// Mengecek status booking berdasarkan ID
// ============================================================

server.tool(
  "cek_status_booking",
  "Mengecek detail dan status booking pelanggan berdasarkan ID booking.",
  {
    booking_id: z
      .string()
      .describe("ID booking yang ingin dicek (contoh: BK001)"),
  },
  async ({ booking_id }) => {
    const bookingList: Booking[] = loadJSON("booking.json");

    const booking = bookingList.find(
      (b) => b.booking_id.toUpperCase() === booking_id.toUpperCase()
    );

    if (!booking) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Booking dengan ID "${booking_id}" tidak ditemukan. Pastikan ID sudah benar.`,
          },
        ],
      };
    }

    const statusIcon =
      booking.status === "Terkonfirmasi" ? "🟡" :
      booking.status === "Selesai" ? "🟢" : "🔴";

    return {
      content: [
        {
          type: "text",
          text:
            `📋 Detail Booking Totalook\n\n` +
            `🔖 ID Booking   : ${booking.booking_id}\n` +
            `👤 Nama         : ${booking.nama_pelanggan}\n` +
            `📞 No HP        : ${booking.no_hp}\n` +
            `💆 Layanan      : ${booking.layanan_nama}\n` +
            `📅 Tanggal      : ${booking.tanggal}\n` +
            `🕐 Jam Mulai    : ${booking.jam}\n` +
            `🕑 Est. Selesai : ${booking.estimasi_selesai}\n` +
            `💰 Total Harga  : Rp ${booking.total_harga.toLocaleString("id-ID")}\n` +
            `${statusIcon} Status        : ${booking.status}`,
        },
      ],
    };
  }
);

// ============================================================
// 🛠️ TOOL 5 — cek_booking_by_hp()
// ============================================================

  server.tool(
      "cek_booking_by_hp",
      "Mencari semua booking milik pelanggan berdasarkan nomor HP.",
      {
        no_hp: z.string().min(10).describe("Nomor HP pelanggan (contoh: 08123456789)"),
      },
      async ({ no_hp }) => {
        const bookingList: Booking[] = loadJSON("booking.json");
        const hasilBooking = bookingList.filter((b) => b.no_hp === no_hp);

        if (hasilBooking.length === 0) {
          return {
            content: [{ type: "text", text: `❌ Tidak ada booking dengan nomor HP "${no_hp}".` }],
          };
        }

        const teks = hasilBooking.map((b) => {
          const statusIcon = b.status === "Terkonfirmasi" ? "🟡" : b.status === "Selesai" ? "🟢" : "🔴";
          return `🔖 ${b.booking_id} — ${b.layanan_nama}\n   📅 ${b.tanggal} pukul ${b.jam}\n   ${statusIcon} ${b.status} | Rp ${b.total_harga.toLocaleString("id-ID")}`;
        }).join("\n\n");

        return {
          content: [{ type: "text", text: `📋 Booking atas nomor HP ${no_hp}:\n\n${teks}\n\nGunakan cek_status_booking() untuk detail lengkap.` }],
        }; 
    }
);

// ============================================================
// 🛠️ TOOL 6 — batalkan_booking()
// ============================================================

server.tool(
    "batalkan_booking",
    "Membatalkan booking pelanggan yang statusnya masih Terkonfirmasi.",
    {
      booking_id: z.string().describe("ID booking yang ingin dibatalkan (contoh: BK001)"),
      no_hp: z.string().min(10).describe("Nomor HP pelanggan untuk verifikasi"),
    },
    async ({ booking_id, no_hp }) => {
      const bookingList: Booking[] = loadJSON("booking.json");
      const index = bookingList.findIndex(
        (b) => b.booking_id.toUpperCase() === booking_id.toUpperCase()
      );

      if (index === -1) {
        return { content: [{ type: "text", text: `❌ Booking "${booking_id}" tidak ditemukan.` }] };
      }

      const booking = bookingList[index];

      if (booking.no_hp !== no_hp) {
        return { content: [{ type: "text", text: `❌ Nomor HP tidak cocok. Pembatalan tidak bisa dilakukan.` }] };
      }

      if (booking.status === "Dibatalkan") {
        return { content: [{ type: "text", text: `⚠️ Booking ${booking_id} sudah dibatalkan sebelumnya.` }] };
      }

      if (booking.status === "Selesai") {
        return { content: [{ type: "text", text: `⚠️ Booking ${booking_id} sudah selesai, tidak bisa dibatalkan.` }] };
      }

      bookingList[index].status = "Dibatalkan";
      fs.writeFileSync(path.join(dataPath, "booking.json"), JSON.stringify(bookingList, null, 2));

      return {
        content: [{
          type: "text",
          text: `✅ Booking Berhasil Dibatalkan\n\n🔖 ID Booking : ${booking.booking_id}\n💆 Layanan    : ${booking.layanan_nama}\n📅 Tanggal    : ${booking.tanggal} pukul ${booking.jam}\n🔴 Status     : Dibatalkan\n\nSlot jadwal kini tersedia kembali. Terima kasih 🌸`,
      }],
    };
  }
);


// ============================================================
// 🚀 JALANKAN SERVER
// ============================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ Totalook MCP Server berjalan...");
}

main().catch((err) => {
  console.error("❌ Error menjalankan MCP Server:", err);
  process.exit(1);
});