const express = require("express");
const bcrypt = require("bcryptjs");
const Usuario = require("../models/Usuario");

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
      !password
    ) {
      return res
        .status(400)
        .json({ message: "Todos los campos obligatorios deben completarse" });
    }

    // Verificar si el usuario ya existe
    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ message: "El correo ya está registrado" });
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

    await nuevoUsuario.save();

    res.status(201).json({ message: "Usuario registrado con éxito" });
  } catch (error) {
    console.error("Error al registrar usuario:", error.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Obtener todos los usuarios
router.get("/", async (req, res) => {
  try {
    const usuarios = await Usuario.find();
    res.status(200).json(usuarios);
  } catch (error) {
    console.error("Error al obtener usuarios:", error.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

module.exports = router;
