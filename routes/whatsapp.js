const { Router } = require("express");
const { whatsapp } = require("../config/whatsapp"); // 🔥 Importar el bot
const router = Router();

router.post("/enviarMensaje", async (req, res) => {
  const { numero, mensaje } = req.body;

  if (!numero || !mensaje) {
    return res
      .status(400)
      .json({ res: false, error: "Número y mensaje son requeridos" });
  }

  try {
    const chatId = numero.replace(/\D/g, "") + "@c.us"; // 🔥 Remueve caracteres no numéricos

    console.log(`📩 Enviando mensaje a: ${chatId}`);

    if (!whatsapp) {
      return res
        .status(500)
        .json({
          res: false,
          error: "El cliente de WhatsApp no está inicializado",
        });
    }

    const number_details = await whatsapp.getNumberId(chatId);
    if (number_details) {
      await whatsapp.sendMessage(chatId, mensaje);
      return res.json({ res: true, mensaje: "✅ Mensaje enviado con éxito" });
    } else {
      return res
        .status(404)
        .json({
          res: false,
          error: "❌ El número no está registrado en WhatsApp",
        });
    }
  } catch (error) {
    console.error("❌ Error enviando mensaje:", error);
    return res
      .status(500)
      .json({ res: false, error: "Error interno en el servidor" });
  }
});

module.exports = router;
