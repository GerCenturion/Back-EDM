const express = require("express");
const { authenticate, authorize } = require("../middleware/authenticate");
const Materia = require("../models/Materia");

const router = express.Router();

// Ruta para crear una nueva materia (solo admin)
router.post("/create", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    const { name, level } = req.body;

    if (!name || !level) {
      return res
        .status(400)
        .json({
          message: "El nombre y el nivel de la materia son obligatorios",
        });
    }

    const nuevaMateria = new Materia({ name, level });
    await nuevaMateria.save();

    res
      .status(201)
      .json({ message: "Materia creada con éxito", materia: nuevaMateria });
  } catch (error) {
    console.error("Error al crear materia:", error.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Ruta para obtener todas las materias
router.get("/", authenticate, async (req, res) => {
  try {
    const materias = await Materia.find();
    res.status(200).json(materias);
  } catch (error) {
    console.error("Error al obtener materias:", error.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Ruta para inscribir a un alumno a una materia (admin o profesor)
router.post(
  "/inscribir/:id",
  authenticate,
  authorize(["admin", "profesor"]),
  async (req, res) => {
    try {
      const { alumnoId } = req.body;
      const materia = await Materia.findById(req.params.id);

      if (!materia) {
        return res.status(404).json({ message: "Materia no encontrada" });
      }

      if (materia.alumnos.includes(alumnoId)) {
        return res
          .status(400)
          .json({ message: "El alumno ya está inscrito en esta materia" });
      }

      materia.alumnos.push(alumnoId);
      await materia.save();

      res.status(200).json({ message: "Alumno inscrito con éxito", materia });
    } catch (error) {
      console.error("Error al inscribir alumno:", error.message);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

module.exports = router;
