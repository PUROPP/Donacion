import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

// ⚠️ CONFIG
const ACCESS_TOKEN = "TU_ACCESS_TOKEN";
const BASE_URL = "http://localhost:5500"; // tu frontend

app.use(cors());
app.use(express.json());

// 🔒 Middleware simple de validación
function validateAmount(req, res, next) {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Monto inválido" });
  }

  if (amount > 10000000) {
    return res.status(400).json({ error: "Monto demasiado alto" });
  }

  next();
}

// 🚀 Crear preferencia
app.post("/api/create-payment", validateAmount, async (req, res) => {
  try {
    const { amount } = req.body;

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

          auto_return: "approved",

          metadata: {
            project: "lumina-donations",
          },
        }),
      }
    );

    const data = await response.json();

    if (!data.init_point) {
      throw new Error("Error creando preferencia");
    }

    res.json({
      url: data.init_point,
    });
  } catch (err) {
    console.error("MP ERROR:", err.message);
    res.status(500).json({ error: "Error creando el pago" });
  }
});

// 🧠 Health check
app.get("/api/health", (_, res) => {
  res.json({ status: "ok" });
});

app.listen(3000, () =>
  console.log("🚀 Server listo en http://localhost:3000")
);
