import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 10000;

// Obtener Access Token de PayPal
async function getAccessToken() {
  const auth = Buffer.from(
    process.env.PAYPAL_CLIENT_ID + ":" + process.env.PAYPAL_SECRET
  ).toString("base64");

  const response = await fetch(`${process.env.PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  const data = await response.json();
  return data.access_token;
}

// Crear orden con intent=AUTHORIZE (preauth)
app.post("/create-order", async (req, res) => {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch(`${process.env.PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intent: "AUTHORIZE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: "10.00" // 🔹 dinámico si quieres
            }
          }
        ]
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Error al crear la orden:", err);
    res.status(500).send("Error al crear la orden");
  }
});

// Capturar (autorizar) el pago
app.post("/capture-order/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const accessToken = await getAccessToken();

    const response = await fetch(
      `${process.env.PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/authorize`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Error al capturar la orden:", err);
    res.status(500).send("Error al capturar la orden");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});