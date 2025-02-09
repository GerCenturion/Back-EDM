const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Usuario = require("../models/Usuario");
const { whatsapp } = require("../config/whatsapp");

const router = express.Router();

// 📌 Función para enviar código de verificación por WhatsApp
const sendWhatsAppMessage = async (chatId, mensaje) => {
  try {
    const number_details = await whatsapp.getNumberId(chatId);
    if (number_details) {
      await whatsapp.sendMessage(chatId, mensaje);
      console.log(`✅ Mensaje enviado a ${chatId}`);
    } else {
      console.log(`❌ El número ${chatId} no está registrado en WhatsApp.`);
    }
  } catch (error) {
    console.error("❌ Error al enviar mensaje de WhatsApp:", error);
  }
};

// 📌 Ruta para iniciar sesión con verificación de cuenta
router.post("/", async (req, res) => {
  try {
    const { dni, password } = req.body;

    if (!dni || !password) {
      return res
        .status(400)
        .json({ message: "DNI y contraseña son obligatorios" });
    }

    const usuario = await Usuario.findOne({ dni });
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const esValida = await bcrypt.compare(password, usuario.password);
    if (!esValida) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    // 📌 Si el usuario no está verificado, enviar código antes de permitir el acceso
    if (!usuario.isVerified) {
      const newCode = crypto.randomInt(100000, 999999).toString();
      usuario.verificationCode = newCode;
      usuario.verificationCodeExpires = Date.now() + 2 * 60 * 60 * 1000; // 2 horas de validez
      await usuario.save();

      const chatId = `${usuario.phoneCode}9${usuario.phoneArea}${usuario.phoneNumber}@c.us`;
      const mensaje = `🔑 *Código de verificación:* ${newCode}\n\nIngresa este código para completar tu acceso al campus.`;

      await sendWhatsAppMessage(chatId, mensaje);

      return res.status(401).json({
        message:
          "Cuenta no verificada. Se ha enviado un código de verificación.",
        requiresVerification: true,
      });
    }

    // 📌 Si la cuenta ya está verificada, generar token y permitir acceso
    const token = jwt.sign(
      {
        id: usuario._id,
        dni: usuario.dni,
        role: usuario.role,
      },
      process.env.JWT_SECRET
    );

    res.status(200).json({
      message: "Inicio de sesión exitoso",
      token,
      user: {
        id: usuario._id,
        name: usuario.name,
        email: usuario.email,
        dni: usuario.dni,
        role: usuario.role,
      },
    });
  } catch (error) {
    console.error("Error al iniciar sesión:", error.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// 📌 Ruta para verificar el código ingresado por el usuario en el login
router.post("/verificar-codigo", async (req, res) => {
  try {
    const { dni, verificationCode } = req.body;
    const usuario = await Usuario.findOne({ dni });

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    if (usuario.isVerified) {
      return res
        .status(400)
        .json({ message: "El usuario ya está verificado." });
    }

    if (usuario.verificationCode !== verificationCode) {
      // 📌 Generar un nuevo código si el usuario ingresa uno incorrecto
      const newCode = crypto.randomInt(100000, 999999).toString();
      usuario.verificationCode = newCode;
      usuario.verificationCodeExpires = Date.now() + 2 * 60 * 60 * 1000; // 2 horas de validez
      await usuario.save();

      const chatId = `${usuario.phoneCode}9${usuario.phoneArea}${usuario.phoneNumber}@c.us`;
      const mensaje = `🔑 *Nuevo Código de Verificación:* ${newCode}\n\nPor favor, ingresa este código para completar tu acceso al campus.`;

      await sendWhatsAppMessage(chatId, mensaje);

      return res.status(400).json({
        message: "Código incorrecto. Se ha enviado un nuevo código.",
        requiresVerification: true,
      });
    }

    if (usuario.verificationCodeExpires < Date.now()) {
      return res
        .status(400)
        .json({ message: "El código ha expirado. Solicita uno nuevo." });
    }

    // 📌 Marcar usuario como verificado
    usuario.isVerified = true;
    usuario.verificationCode = null;
    usuario.verificationCodeExpires = null;
    await usuario.save();

    // 📌 Generar token y permitir acceso
    const token = jwt.sign(
      {
        id: usuario._id,
        dni: usuario.dni,
        role: usuario.role,
      },
      process.env.JWT_SECRET
    );

    res.status(200).json({
      message: "✅ Verificación exitosa. Redirigiendo al campus...",
      token,
      user: {
        id: usuario._id,
        name: usuario.name,
        email: usuario.email,
        dni: usuario.dni,
        role: usuario.role,
      },
    });
  } catch (error) {
    console.error("Error al verificar código:", error.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Ruta para cerrar sesión
router.post("/logout", (req, res) => {
  res.status(200).json({ message: "Sesión cerrada correctamente" });
});

module.exports = router;
