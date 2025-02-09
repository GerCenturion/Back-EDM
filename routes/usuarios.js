const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Usuario = require("../models/Usuario");
const { authenticate, authorize } = require("../middleware/authenticate");
const { whatsapp } = require("../config/whatsapp");

const router = express.Router();

// 📌 Función para enviar mensaje de WhatsApp (Directamente en usuarios.js)
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

// 📌 Reenviar código de verificación si el usuario ingresó uno incorrecto
router.post("/reenviar-codigo", async (req, res) => {
  try {
    const { email } = req.body;
    const usuario = await Usuario.findOne({ email });

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    if (usuario.isVerified) {
      return res
        .status(400)
        .json({ message: "Este usuario ya está verificado." });
    }

    // 🔥 Generar un nuevo código de verificación directamente con crypto
    const newCode = crypto.randomInt(100000, 999999).toString();
    usuario.verificationCode = newCode;
    usuario.verificationCodeExpires = Date.now() + 2 * 60 * 60 * 1000; // 2 horas de validez
    await usuario.save();

    // 🔥 Enviar nuevo código por WhatsApp
    const chatId = `${usuario.phoneCode}${usuario.phoneArea}${usuario.phoneNumber}@c.us`;
    const mensaje = `🔑 *Nuevo Código de Verificación:* ${newCode}\n\nPor favor, ingresa este código en el formulario para completar tu registro.`;

    try {
      await sendWhatsAppMessage(chatId, mensaje);
    } catch (error) {
      console.error("❌ Error al enviar mensaje de WhatsApp:", error);
      return res
        .status(500)
        .json({ message: "Error al enviar código por WhatsApp." });
    }

    res.status(200).json({ message: "📩 Nuevo código enviado por WhatsApp." });
  } catch (error) {
    console.error("❌ Error al reenviar código:", error.message);
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

// 📌 Crear un usuario y enviar código de verificación por WhatsApp
router.post("/", async (req, res) => {
  try {
    const {
      name,
      email,
      phoneCode,
      phoneArea,
      phoneNumber,
      phoneType,
      birthdate,
      dni,
      address,
      civilStatus,
      profession,
      church,
      ministerialRole,
      reason,
      password,
    } = req.body;

    // Validar campos obligatorios
    if (
      !name ||
      !email ||
      !phoneCode ||
      !phoneArea ||
      !phoneNumber ||
      !dni ||
      !password
    ) {
      return res
        .status(400)
        .json({ message: "Todos los campos obligatorios deben completarse" });
    }

    // Verificar si el usuario ya existe por correo o DNI
    const usuarioExistente = await Usuario.findOne({
      $or: [{ email }, { dni }],
    });
    if (usuarioExistente) {
      return res.status(400).json({
        message:
          "El correo electrónico o el DNI ya están registrados en el sistema.",
      });
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generar código de verificación (6 dígitos) y establecer tiempo de expiración (2 horas)
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const expirationTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 horas

    // Crear usuario en la base de datos con estado "no verificado"
    const nuevoUsuario = new Usuario({
      name,
      email,
      phoneCode,
      phoneArea,
      phoneNumber,
      phoneType,
      birthdate,
      dni,
      address,
      civilStatus,
      profession,
      church,
      ministerialRole,
      reason,
      password: hashedPassword,
      verificationCode,
      verificationCodeExpires: expirationTime,
      isVerified: false, // 🔥 Se marca como no verificado hasta que ingrese el código
    });

    await nuevoUsuario.save();

    // 🔥 Enviar código de verificación por WhatsApp
    const chatId = `${phoneCode}${phoneArea}${phoneNumber}@c.us`;
    const mensaje = `📌 *Tu código de verificación para el Campus Virtual es:* *${verificationCode}*\n\nEste código es válido por 2 horas.`;

    try {
      const number_details = await whatsapp.getNumberId(chatId);
      if (number_details) {
        await whatsapp.sendMessage(chatId, mensaje);
        console.log(`✅ Código de verificación enviado a ${chatId}`);
      } else {
        console.log(`❌ El número ${chatId} no está registrado en WhatsApp.`);
      }
    } catch (error) {
      console.error("❌ Error al enviar el código de verificación:", error);
    }

    res
      .status(201)
      .json({ message: "Código de verificación enviado por WhatsApp." });
  } catch (error) {
    console.error("Error al registrar usuario:", error.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// 📌 Verificar código de confirmación y activar cuenta + Mensaje de bienvenida
router.post("/verificar", async (req, res) => {
  try {
    const { email, verificationCode } = req.body;
    const usuario = await Usuario.findOne({ email });

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    if (usuario.isVerified) {
      return res
        .status(400)
        .json({ message: "Este usuario ya está verificado." });
    }

    if (usuario.verificationCode !== verificationCode) {
      return res.status(400).json({ message: "Código incorrecto." });
    }

    if (usuario.verificationCodeExpires < new Date()) {
      return res
        .status(400)
        .json({ message: "El código ha expirado. Solicita un nuevo código." });
    }

    // 🔥 Marcar usuario como verificado
    usuario.isVerified = true;
    usuario.verificationCode = null;
    usuario.verificationCodeExpires = null;
    await usuario.save();

    // 🔥 Enviar mensaje de bienvenida por WhatsApp
    const chatId = `${usuario.phoneCode}${usuario.phoneArea}${usuario.phoneNumber}@c.us`;
    const mensajeBienvenida = `🎉 ¡Bienvenido/a ${usuario.name} al Campus Virtual! 🎓📚\n\nNos alegra mucho tenerte con nosotros. Recuerda que puedes acceder a los cursos, materiales y más desde nuestra plataforma.\n\nSi tienes dudas, contáctanos.\n\n📌 *Campus Virtual*`;

    try {
      const number_details = await whatsapp.getNumberId(chatId);
      if (number_details) {
        await whatsapp.sendMessage(chatId, mensajeBienvenida);
        console.log(`✅ Mensaje de bienvenida enviado a ${chatId}`);
      } else {
        console.log(`❌ El número ${chatId} no está registrado en WhatsApp.`);
      }
    } catch (error) {
      console.error("❌ Error al enviar mensaje de bienvenida:", error);
    }

    res
      .status(200)
      .json({ message: "✅ Verificación exitosa. Registro completado." });
  } catch (error) {
    console.error("Error al verificar código:", error.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});
// Obtener todos los usuarios (Solo admin)
router.get("/", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    const usuarios = await Usuario.find();
    res.status(200).json(usuarios);
  } catch (error) {
    console.error("Error al obtener usuarios:", error.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Ruta de prueba para administradores
router.get("/admin", authenticate, authorize(["admin"]), (req, res) => {
  res.status(200).json({
    message: "Ruta solo para administradores funcionando correctamente",
  });
});

// Obtener información del usuario autenticado
router.get("/me", authenticate, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.user.id).select("-password"); // Excluir la contraseña
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.status(200).json(usuario);
  } catch (error) {
    console.error("Error al obtener el usuario:", error.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Cambiar contraseña del usuario autenticado
router.put("/cambiar-contrasena", authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Todos los campos son obligatorios." });
    }

    const usuario = await Usuario.findById(req.user.id);

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    // Verificar la contraseña actual
    const isMatch = await bcrypt.compare(currentPassword, usuario.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "La contraseña actual es incorrecta." });
    }

    // Encriptar la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Actualizar la contraseña en la base de datos
    usuario.password = hashedPassword;
    await usuario.save();

    res.status(200).json({ message: "Contraseña actualizada con éxito." });
  } catch (error) {
    console.error("Error al cambiar la contraseña:", error.message);
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

module.exports = router;
