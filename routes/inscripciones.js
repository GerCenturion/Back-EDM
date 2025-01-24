const express = require("express");
const router = express.Router();
const Inscripcion = require("../models/Inscripcion"); // Asegúrate de importar el modelo adecuado

// Ruta POST para guardar inscripciones
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

    // Validación básica
    if (
      !name ||
      !email ||
      !phoneCode ||
      !phoneArea ||
      !phoneNumber ||
      !phoneType ||
      !birthdate ||
      !dni ||
      !address ||
      !civilStatus ||
      !profession ||
      !church ||
      !reason ||
      !password
    ) {
      return res
        .status(400)
        .json({ message: "Todos los campos son obligatorios" });
    }

    // Crear nueva inscripción usando el modelo de Mongoose
    const nuevaInscripcion = new Inscripcion({
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
      password, // Nota: En un caso real, deberías encriptar la contraseña antes de guardarla
    });

    // Guardar en la base de datos
    await nuevaInscripcion.save();

    // Responder con éxito
    res.status(201).json({ message: "Inscripción registrada con éxito" });
  } catch (error) {
    console.error("Error en la ruta de inscripción:", error.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

module.exports = router;
