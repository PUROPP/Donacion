import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import "dotenv/config";

const app = express();

/* =========================
   ⚙️ CONFIG
========================= */
const PORT = process.env.PORT || 3000;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const BASE_URL = process.env.BASE_URL;

// Validación crítica de variables
if (!ACCESS_TOKEN) {
  console.error("❌ Falta ACCESS_TOKEN en variables de entorno");
  process.exit(1);
}

if (!BASE_URL) {
  console.error("❌ Falta BASE_URL en variables de entorno");
  process.exit(1);
}

/* =========================
   🔒 MIDDLEWARES
========================= */
app.use(cors({
  origin: "*", // en producción puedes restringir
  methods: ["GET", "POST"],
}));

app.use(express.json({ limit: "10kb" }));

/* =========================
   🧠 HEALTHCHECK
========================= */
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "lumina-backend",
    time: new Date().toISOString(),
  });
});

/* =========================
   🌐 ROOT (evita pantalla blanca)
========================= */
app.get("/", (req, res) => {
  res.send("🚀 Lumina Backend funcionando");
});

/* =========================
   💳 CREAR PAGO
========================= */
app.post("/api/create-payment", async (req, res) => {
  try {
    let { amount } = req.body;

    // 🔒 Validaciones robustas
    amount = Number(amount);

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: "Monto inválido" });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: "El monto debe ser mayor a 0" });
    }

    if (amount > 10000000) {
      return res.status(400).json({ error: "Monto demasiado alto" });
    }

    console.log("💰 Creando pago:", amount);

    const response = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          items: [
            {
              title: "Donación Lumina",
              quantity: 1,
              currency_id: "CLP",
              unit_price: amount,
            },
          ],

          back_urls: {
            success: `${BASE_URL}/success.html`,
            failure: `${BASE_URL}/error.html`,
            pending: `${BASE_URL}/pending.html`,
          },

          notification_url: `${BASE_URL}/api/webhook`,
          auto_return: "approved",

          metadata: {
            project: "lumina",
            timestamp: Date.now(),
          },
        }),
      }
    );

    const data = await response.json();

    if (!data.init_point) {
      console.error("❌ Respuesta inválida MP:", data);
      return res.status(500).json({ error: "Error creando preferencia" });
    }

    console.log("✅ Pago creado");

    res.json({ url: data.init_point });

  } catch (err) {
    console.error("❌ CREATE PAYMENT ERROR:", err);
    res.status(500).json({ error: "Error creando el pago" });
  }
});

/* =========================
   🔥 WEBHOOK
========================= */
app.post("/api/webhook", async (req, res) => {
  try {
    console.log("📩 Webhook recibido:", JSON.stringify(req.body));

    const paymentId = req.body?.data?.id;

    if (!paymentId) {
      console.log("⚠️ Webhook sin paymentId");
      return res.sendStatus(200);
    }

    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
      }
    );

    const payment = await response.json();

    console.log("💰 Estado pago:", payment.status);

    if (payment.status === "approved") {
      console.log("✅ DONACIÓN CONFIRMADA");
      // 🔥 aquí luego guardas en DB
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("❌ WEBHOOK ERROR:", err);
    res.sendStatus(500);
  }
});

/* =========================
   ❌ 404 HANDLER
========================= */
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

/* =========================
   🚀 START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`🚀 Backend listo en puerto ${PORT}`);
});
