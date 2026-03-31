import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const BASE_URL = process.env.BASE_URL;

// 🧠 Crear pago
app.post("/api/create-payment", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Monto inválido" });
    }

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
              unit_price: Number(amount),
            },
          ],
          back_urls: {
            success: `${BASE_URL}/success.html`,
            failure: `${BASE_URL}/error.html`,
            pending: `${BASE_URL}/pending.html`,
          },
          notification_url: `${BASE_URL}/api/webhook`, // 🔥 CLAVE
          auto_return: "approved",
        }),
      }
    );

    const data = await response.json();

    res.json({ url: data.init_point });

  } catch (err) {
    console.error("CREATE PAYMENT ERROR:", err);
    res.status(500).json({ error: "Error creando pago" });
  }
});


// 🔥 WEBHOOK REAL (clave para producción)
app.post("/api/webhook", async (req, res) => {
  try {
    console.log("📩 Webhook recibido:", req.body);

    const paymentId = req.body?.data?.id;

    if (!paymentId) return res.sendStatus(200);

    // 🔍 Verificar pago con MP
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
      // 💾 Aquí guardas en DB (luego)
      console.log("✅ DONACIÓN CONFIRMADA");
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("WEBHOOK ERROR:", err);
    res.sendStatus(500);
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log("🚀 Backend listo")
);
