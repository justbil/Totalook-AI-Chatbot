import express from "express";
import cors from "cors";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import ollama from "ollama";
import path from "path";
import { fileURLToPath } from "url";

// ============================================================
// ⚙️ SETUP
// ============================================================

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

// Sajikan folder frontend sebagai static files
const frontendPath = path.resolve(__dirname, "../frontend");
app.use(express.static(frontendPath));
// ============================================================
// 🔌 KONEKSI KE MCP SERVER
// ============================================================

let mcpClient: Client | null = null;
let mcpTools: any[] = [];

async function connectMCP() {
  try {
    const transport = new StdioClientTransport({
      command: "npx",
      args: ["tsx", path.join(__dirname, "mcp-server.ts")],
    });

    mcpClient = new Client({ name: "totalook-client", version: "1.0.0" });
    await mcpClient.connect(transport);

    // Ambil semua tools dari MCP Server
    const toolsResult = await mcpClient.listTools();
    mcpTools = toolsResult.tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));

    console.log(`✅ MCP Server terhubung! Tools tersedia: ${mcpTools.map((t) => t.function.name).join(", ")}`);
  } catch (error) {
    console.error("❌ Gagal menghubungkan ke MCP Server:", error);
  }
}

// ============================================================
// 📡 ENDPOINT 1 — GET /layanan
// Mengambil semua layanan salon
// ============================================================

app.get("/layanan", async (req, res) => {
  try {
    if (!mcpClient) {
      res.status(500).json({ error: "MCP Server tidak terhubung" });
      return;
    }

    const hasil = await mcpClient.callTool({
      name: "get_layanan",
      arguments: { kategori: "Semua" },
    });

    res.json({ success: true, data: hasil.content });
  } catch (error) {
    res.status(500).json({ error: "Gagal mengambil data layanan" });
  }
});

// ============================================================
// 📡 ENDPOINT 2 — POST /booking
// Membuat booking baru
// ============================================================

app.post("/booking", async (req, res) => {
  try {
    if (!mcpClient) {
      res.status(500).json({ error: "MCP Server tidak terhubung" });
      return;
    }

    const { nama_pelanggan, no_hp, layanan_id, tanggal, jam } = req.body;

    // Validasi input
    if (!nama_pelanggan || !no_hp || !layanan_id || !tanggal || !jam) {
      res.status(400).json({
        error: "Semua field wajib diisi: nama_pelanggan, no_hp, layanan_id, tanggal, jam",
      });
      return;
    }

    const hasil = await mcpClient.callTool({
      name: "buat_booking",
      arguments: { nama_pelanggan, no_hp, layanan_id, tanggal, jam },
    });

    res.json({ success: true, data: hasil.content });
  } catch (error) {
    res.status(500).json({ error: "Gagal membuat booking" });
  }
});

// ============================================================
// 📡 ENDPOINT 3 — GET /status/:booking_id
// Cek status booking
// ============================================================

app.get("/status/:booking_id", async (req, res) => {
  try {
    if (!mcpClient) {
      res.status(500).json({ error: "MCP Server tidak terhubung" });
      return;
    }

    const { booking_id } = req.params;

    const hasil = await mcpClient.callTool({
      name: "cek_status_booking",
      arguments: { booking_id },
    });

    res.json({ success: true, data: hasil.content });
  } catch (error) {
    res.status(500).json({ error: "Gagal mengecek status booking" });
  }
});

// ============================================================
// 📡 ENDPOINT 4 — GET /jadwal
// Cek jadwal tersedia
// ============================================================

app.get("/jadwal", async (req, res) => {
  try {
    if (!mcpClient) {
      res.status(500).json({ error: "MCP Server tidak terhubung" });
      return;
    }

    const { tanggal, layanan_id } = req.query;

    if (!tanggal || !layanan_id) {
      res.status(400).json({ error: "Parameter tanggal dan layanan_id wajib diisi" });
      return;
    }

    const hasil = await mcpClient.callTool({
      name: "cek_jadwal_tersedia",
      arguments: {
        tanggal: tanggal as string,
        layanan_id: layanan_id as string,
      },
    });

    res.json({ success: true, data: hasil.content });
  } catch (error) {
    res.status(500).json({ error: "Gagal mengecek jadwal" });
  }
});

// ============================================================
// 📡 ENDPOINT 5 — POST /chat
// Chat dengan AI (Ollama) menggunakan MCP tools
// ============================================================

app.post("/chat", async (req, res) => {
  try {
    if (!mcpClient) {
      res.status(500).json({ error: "MCP Server tidak terhubung" });
      return;
    }

    const { message, history } = req.body;
    if (!message) {
      res.status(400).json({ error: "Field message wajib diisi" });
      return;
    }

    const cleanHistory = (history || []).filter(
      (h: any) => h.role === "user" || h.role === "assistant"
    );

    const messages: any[] = [
      {
        role: "system",
        content: `Kamu adalah asisten virtual salon kecantikan Totalook. 
                  Hari ini adalah ${new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} (${new Date().toISOString().split("T")[0]}).
        
        Kamu membantu pelanggan untuk:
        - Melihat daftar layanan salon
        - Membuat booking layanan
        - Mengecek jadwal yang tersedia
        - Mengecek status booking
        
        PENTING - Ikuti alur ini saat pelanggan ingin booking:
        1. Tanya layanan apa yang diinginkan -> gunakan get_layanan() untuk tampilkan pilihan layanan
        2. Tanyakan tanggal yang diinginkan
        3. WAJIB cek jadwal dulu dengan cek_jadwal_tersedia() sebelum booking
        4. Jika jam yang diminta TIDAK ADA di hasil cek_jadwal_tersedia(), artinya jam itu PENUH -> beritahu pelanggan dan tawarkan jam lain yang tersedia
        5. DILARANG memanggil buat_booking() jika jam yang diminta tidak ada di daftar jam tersedia
        6. DILARANG KERAS menebak atau mengasumsikan jam tersedia tanpa memanggil cek_jadwal_tersedia()
        7. Sebelum konfirmasi booking, WAJIB tanya nama lengkap dan nomor HP pelanggan jika belum ada
        8. Baru lakukan buat_booking() HANYA jika jam yang diminta ADA di daftar jam tersedia dan pelanggan sudah konfirmasi
        
        ATURAN SAPAAN:
        - Jika pelanggan menyapa (halo, hai, hi, hello, hey, selamat pagi, selamat siang, selamat malam),
          WAJIB balas dengan pesan ini PERSIS, tidak boleh diubah atau disingkat:
          "Halo! Selamat datang di Totalook 💕

        Saya Tola, asisten virtual salon kecantikan Totalook. Saya siap membantu kamu untuk:

        ✂️ Potong Rambut — Rp 50.000
        💆 Hair Spa — Rp 120.000
        🌿 Creambath — Rp 100.000
        🎨 Cat Rambut — Rp 200.000
        ✨ Facial — Rp 150.000
        💅 Manicure — Rp 75.000
        🦶 Pedicure — Rp 80.000

       Ketik pesanmu atau pilih menu di atas untuk mulai. Ada yang bisa saya bantu? 😊"
        - Jika pelanggan langsung tanya tanpa sapaan, langsung jawab tanpa sapaan
        - JANGAN mulai setiap jawaban dengan "Halo" atau "Hai" berulang-ulang

        ATURAN FORMAT PESAN:
        - DILARANG menggunakan tabel Markdown (| kolom | kolom|)
        - DILARANG menggunakan --- atau === sebagai pemisah
        - DILARANG menggunakan ### atau ## atau # untuk heading
        - Gunakan emoji sebagai penanda, contoh: ✅ ❌ ⚠️ 🔹
        - Format jadwal tersedia seperti ini:
          "✅ Cat Rambut → jam tersedia: 09:00, 10:00, 11:00
           ❌ Potong Rambut jam 10:00 penuh! Jam lain: 09:00, 11:00, 13:00"
        - Pisahkan setiap layanan dengan baris kosong 
        - Gunakan teks biasa yang mudah dibaca
        
        Selalu jawab dalam Bahasa Indonesia dengan ramah dan profesional
        Gunakan tools yang tersedia untuk memberikan informasi yang akurat dan membantu pelanggan dengan efektif.`,
      },
        ...cleanHistory,
        { role: "user", content: message },
    ];

    // Loop untuk menangani tool calls dari Ollama
    let response = await ollama.chat({
      model: "gpt-oss:120b-cloud",
      messages,
      tools: mcpTools,
    });

    // Definisikan antarmuka untuk jenis konten MCP
    interface TextContent {
      type: "text";
      text: string;
    }

    interface ResourceContent {
      type: "resource";
      resource: any; // Sesuaikan berdasarkan struktur resource sebenarnya
    }

    type MCPContent = TextContent | ResourceContent;

    // Proses tool calls jika ada
    while (response.message.tool_calls && response.message.tool_calls.length > 0) {
      messages.push(response.message);

      for (const toolCall of response.message.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = toolCall.function.arguments;

        console.log(`🔧 Memanggil tool: ${toolName}`, toolArgs);

        const toolResult = await mcpClient.callTool({
          name: toolName,
          arguments: toolArgs,
        });

        // ✅ FIX: handle berbagai tipe content dari MCP (text, resource, dll)
        console.log(`🔧 Raw tool result dari "${toolName}":`, JSON.stringify(toolResult.content, null, 2));

        // Nyatakan tipe content sebagai array MCPContent (tambah pemeriksaan runtime jika diperlukan)
        const content = toolResult.content as MCPContent[];

        const resultText = content
          .map((c) => {
            if (c.type === "text") return c.text;
            if (c.type === "resource") return JSON.stringify(c.resource);
            return "";
          })
          .filter(Boolean)
          .join("\n");

        if (!resultText) {
          console.warn(`⚠️ Tool "${toolName}" mengembalikan konten kosong`);
        }

        messages.push({
          role: "tool",
          content: resultText,
        });
      }

      // Minta Ollama untuk membuat respons akhir
      response = await ollama.chat({
        model: "gpt-oss:120b-cloud",
        messages,
        tools: mcpTools,
      });
    }

    res.json({
      success: true,
      response: response.message.content,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error chat:", error);
    const message = error instanceof Error ? error.message : "Gagal memproses pesan";
    res.status(500).json({ error: "Gagal memproses pesan", detail: message });
  }
});

// ============================================================
// 🚀 JALANKAN SERVER
// ============================================================

async function main() {
  await connectMCP();

  app.listen(PORT, () => {
    console.log(`🚀 Totalook Server berjalan di http://localhost:${PORT}`);
    console.log(`📋 Endpoints tersedia:`);
    console.log(`   GET  /layanan`);
    console.log(`   POST /booking`);
    console.log(`   GET  /status/:booking_id`);
    console.log(`   GET  /jadwal?tanggal=&layanan_id=`);
    console.log(`   POST /chat`);
  });
}

main().catch((err) => {
  console.error("❌ Error menjalankan server:", err);
  process.exit(1);
});