const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario");

const router = express.Router();

// Ruta para iniciar sesión
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

    // Generar un token sin expiración
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

// Ruta para cerrar sesión
router.post("/logout", (req, res) => {
  res.status(200).json({ message: "Sesión cerrada correctamente" });
});

module.exports = router;
