const express = require("express");
const { authenticate, isAdmin } = require("../middleware/authenticate");
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
    const { name, email, role } = req.body;

    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    usuario.name = name || usuario.name;
    usuario.email = email || usuario.email;
    usuario.role = role || usuario.role;

    await usuario.save();
    res.status(200).json({ message: "Usuario actualizado con éxito" });
  } catch (error) {
    console.error("Error al actualizar usuario:", error.message);
    res.status(500).json({ message: "Error interno del servidor" });
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

module.exports = router;
