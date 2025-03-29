const express = require("express");
const { authenticate, isAdmin } = require("../middleware/authenticate");
const bcrypt = require("bcryptjs");
const Usuario = require("../models/Usuario");

const router = express.Router();

// Ruta para obtener todos los usuarios (solo admin)
router.get("/usuarios", authenticate, isAdmin, async (req, res) => {
  try {
    const usuarios = await Usuario.find();
    res.status(200).json(usuarios);
  } catch (error) {
    console.error("Error al obtener usuarios:", error.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Ruta para obtener un usuario específico (solo admin)
router.get("/usuarios/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.status(200).json(usuario);
  } catch (error) {
    console.error("Error al obtener usuario:", error.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Ruta para actualizar un usuario (solo admin)
router.put("/usuarios/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { name, dni, role, legajo, phoneCode, phoneArea, phoneNumber } =
      req.body;

    // Buscar usuario en la base de datos
    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Actualizar solo los campos que se proporcionan
    if (name) usuario.name = name;
    if (dni) usuario.email = dni;
    if (role) usuario.role = role;
    if (legajo) usuario.legajo = legajo;
    if (phoneCode) usuario.phoneCode = phoneCode;
    if (phoneArea) usuario.phoneArea = phoneArea;
    if (phoneNumber) usuario.phoneNumber = phoneNumber;

    await usuario.save();

    res.status(200).json({ message: "✅ Usuario actualizado con éxito." });
  } catch (error) {
    console.error("❌ Error al actualizar usuario:", error.message);
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

// Eliminar un usuario
router.delete("/usuarios/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findByIdAndDelete(id);

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.status(200).json({ message: "Usuario eliminado" });
  } catch (error) {
    console.error("Error al eliminar usuario:", error.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.post("/usuarios", authenticate, isAdmin, async (req, res) => {
  try {
    const {
      name,
      role,
      legajo,
      phoneCode,
      phoneArea,
      phoneNumber,
      dni,
      password,
    } = req.body;

    // Validar campos requeridos
    if (!name || !role || !dni || !password) {
      return res
        .status(400)
        .json({ message: "Todos los campos obligatorios deben completarse." });
    }

    // Verificar si el usuario ya existe por email o DNI
const usuarioExistente = await Usuario.findOne({
  $or: [{ dni }],
});

if (usuarioExistente) {
  return res.status(400).json({ message: "El DNI ya está registrado." });
}
    // Encriptar la contraseña antes de guardarla
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear el nuevo usuario
const nuevoUsuario = new Usuario({
  name,
  role,
  legajo: legajo || "",
  phoneCode: phoneCode || "",
  phoneArea: phoneArea || "",
  phoneNumber: phoneNumber || "",
  dni,
  email: `${dni}@noemail.com`, // ✅ Email único basado en DNI
  password: hashedPassword,
});
    await nuevoUsuario.save();

    res.status(201).json({ message: "✅ Usuario creado con éxito." });
  } catch (error) {
    console.error("❌ Error al crear usuario:", error.message);
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

module.exports = router;
