const express = require("express");
const Usuario = require("../models/Usuario");
const authenticate = require("../middleware/auth");
const router = express.Router();

// Middleware para verificar si el usuario es administrador
const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Acceso denegado. Solo administradores." });
  }
  next();
};

// Obtener todos los usuarios
router.get("/usuarios", authenticate, isAdmin, async (req, res) => {
  try {
    const usuarios = await Usuario.find().select("-password"); // Excluir contraseña
    res.status(200).json(usuarios);
  } catch (error) {
    console.error("Error al obtener usuarios:", error.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Actualizar un usuario
router.put("/usuarios/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el usuario existe
    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Actualizar datos
    const { name, email, role } = req.body;
    usuario.name = name || usuario.name;
    usuario.email = email || usuario.email;
    usuario.role = role || usuario.role;

    await usuario.save();

    res.status(200).json({ message: "Usuario actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar el usuario:", error.message);
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

// Obtener un usuario por ID
router.get("/usuarios/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.findById(id).select("-password");
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.status(200).json(usuario);
  } catch (error) {
    console.error("Error al obtener el usuario:", error.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

module.exports = router;
