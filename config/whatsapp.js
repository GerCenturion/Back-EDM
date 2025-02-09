const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const puppeteer = require("puppeteer");

const whatsapp = new Client({
  authStrategy: new LocalAuth({ clientId: "campus-whatsapp" }), // 🔥 Guarda la sesión
  puppeteer: {
    executablePath: puppeteer.executablePath(),
    headless: true, // 🔥 Ejecuta sin abrir el navegador
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

whatsapp.on("qr", (qr) => {
  console.log("🔹 Escanea este QR para iniciar sesión en WhatsApp:");
  qrcode.generate(qr, { small: true });
});

whatsapp.on("ready", () => {
  console.log("✅ WhatsApp Bot Listo!");
});

whatsapp.on("authenticated", () => {
  console.log("🔑 Sesión autenticada correctamente.");
});

whatsapp.on("auth_failure", (msg) => {
  console.error("❌ Error en la autenticación:", msg);
});

whatsapp.on("disconnected", (reason) => {
  console.log("🔴 Cliente desconectado:", reason);
});

whatsapp.initialize();

module.exports = { whatsapp };
