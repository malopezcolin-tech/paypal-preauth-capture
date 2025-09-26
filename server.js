import express from "express";
import fetch from "node-fetch";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Verificar variables
app.get("/check-env", (req, res) => {
  res.json({
    paypal_client_id: process.env.PAYPAL_CLIENT_ID ? "✅ Configurado" : "❌ Faltante",
    paypal_secret: process.env.PAYPAL_CLIENT_SECRET ? "✅ Configurado" : "❌ Faltante",
    paypal_api_base: process.env.PAYPAL_API_BASE || "❌ Faltante",
    node_env: process.env.NODE_ENV || "development",
    port: process.env.PORT || 3000
  });
});

// Obtener access token
async function generateAccessToken() {
  const response = await fetch(\`\${process.env.PAYPAL_API_BASE}/v1/oauth2/token\`, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + Buffer.from(
        process.env.PAYPAL_CLIENT_ID + ":" + process.env.PAYPAL_CLIENT_SECRET
      ).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  const data = await response.json();
  return data.access_token;
}

// Crear orden (AUTHORIZE)
app.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;
    const accessToken = await generateAccessToken();

    const response = await fetch(\`\${process.env.PAYPAL_API_BASE}/v2/checkout/orders\`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": \`Bearer \${accessToken}\`
      },
      body: JSON.stringify({
        intent: "AUTHORIZE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: amount || "10.00"
            }
          }
        ]
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("❌ Error en /create-order:", err);
    res.status(500).json({ error: "Error al crear la orden" });
  }
});

// Autorizar orden
app.post("/authorize-order", async (req, res) => {
  try {
    const { orderID } = req.body;
    const accessToken = await generateAccessToken();

    const response = await fetch(\`\${process.env.PAYPAL_API_BASE}/v2/checkout/orders/\${orderID}/authorize\`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": \`Bearer \${accessToken}\`
      }
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("❌ Error en /authorize-order:", err);
    res.status(500).json({ error: "Error al autorizar la orden" });
  }
});

// Capturar pago
app.post("/capture-order", async (req, res) => {
  try {
    const { authorizationID } = req.body;
    const accessToken = await generateAccessToken();

    const response = await fetch(\`\${process.env.PAYPAL_API_BASE}/v2/payments/authorizations/\${authorizationID}/capture\`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": \`Bearer \${accessToken}\`
      }
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("❌ Error en /capture-order:", err);
    res.status(500).json({ error: "Error al capturar la orden" });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`✅ Servidor corriendo en http://localhost:\${PORT}\`);
});
