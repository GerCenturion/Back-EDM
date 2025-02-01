const express = require("express");
const { authenticate, authorize } = require("../middleware/authenticate");
const Examen = require("../models/Examen");
const Materia = require("../models/Materia");

const router = express.Router();

// 📌 Crear un examen y asociarlo a una materia
router.post(
  "/crear",
  authenticate,
  authorize(["profesor", "admin"]),
  async (req, res) => {
    try {
      const { titulo, materia, preguntas } = req.body;

      if (!titulo || !materia || !preguntas || preguntas.length === 0) {
        return res
          .status(400)
          .json({
            message: "El título, la materia y las preguntas son requeridas",
          });
      }

      const nuevoExamen = new Examen({
        titulo,
        materia,
        profesor: req.user.id,
        preguntas,
      });

      const examenGuardado = await nuevoExamen.save();

      // Asociar el examen a la materia
      await Materia.findByIdAndUpdate(materia, {
        $push: { examenes: examenGuardado._id },
      });

      res
        .status(201)
        .json({ message: "Examen creado con éxito", examen: examenGuardado });
    } catch (error) {
      console.error("Error al crear examen:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

// 📌 Obtener exámenes de una materia
router.get("/:materiaId", authenticate, async (req, res) => {
  try {
    const materia = await Materia.findById(req.params.materiaId).populate(
      "examenes"
    );

    if (!materia) {
      return res.status(404).json({ message: "Materia no encontrada" });
    }

    res.status(200).json(materia.examenes);
  } catch (error) {
    console.error("Error al obtener exámenes:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// 📌 Eliminar un examen de una materia
router.delete(
  "/:examenId",
  authenticate,
  authorize(["profesor", "admin"]),
  async (req, res) => {
    try {
      const examen = await Examen.findById(req.params.examenId);

      if (!examen)
        return res.status(404).json({ message: "Examen no encontrado" });

      await Materia.findByIdAndUpdate(examen.materia, {
        $pull: { examenes: examen._id },
      });
      await examen.deleteOne();

      res.status(200).json({ message: "Examen eliminado con éxito" });
    } catch (error) {
      console.error("Error al eliminar examen:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

module.exports = router;
