const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario");

const router = express.Router();

// Ruta para iniciar sesión
router.post("/", async (req, res) => {
  try {
    const { dni, password } = req.body;

    // Validar campos obligatorios
    if (!dni || !password) {
      return res
        .status(400)
        .json({ message: "DNI y contraseña son obligatorios" });
    }

    // Verificar si el usuario existe por DNI
    const usuario = await Usuario.findOne({ dni });
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Verificar la contraseña
    const esValida = await bcrypt.compare(password, usuario.password);
    if (!esValida) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    // Generar un token JWT
    const token = jwt.sign(
      { id: usuario._id, dni: usuario.dni },
      process.env.JWT_SECRET, // Clave secreta almacenada en .env
      { expiresIn: "1h" } // El token expira en 1 hora
    );

    // Responder con el token
    res.status(200).json({
      message: "Inicio de sesión exitoso",
      token,
      user: {
        id: usuario._id,
        name: usuario.name,
        email: usuario.email,
        dni: usuario.dni,
      },
    });
  } catch (error) {
    console.error("Error al iniciar sesión:", error.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

module.exports = router;
