const express = require("express");
const bcrypt = require("bcryptjs");
const Usuario = require("../models/Usuario");
const { authenticate, authorize } = require("../middleware/authenticate");

const router = express.Router();

// Crear un usuario / inscripción
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

    // Crear usuario
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
    });

    // Guardar usuario en la base de datos
    await nuevoUsuario.save();

    // Respuesta exitosa
    res.status(201).json({ message: "Usuario registrado con éxito" });
  } catch (error) {
    console.error("Error al registrar usuario:", error.message);
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
