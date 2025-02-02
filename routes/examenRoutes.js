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
        return res.status(400).json({
          message: "El título, la materia y las preguntas son requeridas",
        });
      }

      // Validamos preguntas
      preguntas.forEach((pregunta) => {
        if (!["multiple-choice", "desarrollo"].includes(pregunta.tipo)) {
          throw new Error(
            "El tipo de pregunta debe ser 'multiple-choice' o 'desarrollo'"
          );
        }

        if (
          pregunta.tipo === "multiple-choice" &&
          (!pregunta.opciones || pregunta.opciones.length === 0)
        ) {
          throw new Error(
            "Las preguntas de selección múltiple deben tener opciones."
          );
        }
      });

      const nuevoExamen = new Examen({
        titulo,
        materia,
        profesor: req.user.id,
        preguntas,
      });

      const examenGuardado = await nuevoExamen.save();

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
// 📌 Obtener un examen específico
router.get(
  "/examenes/:examenId",
  authenticate,
  authorize(["profesor", "alumno", "admin"]),
  async (req, res) => {
    try {
      const examen = await Examen.findById(req.params.examenId).populate(
        "materia"
      );

      if (!examen) {
        return res.status(404).json({ message: "Examen no encontrado" });
      }

      res.status(200).json(examen);
    } catch (error) {
      console.error("Error al obtener examen:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

// 📌 Enviar respuestas del examen
router.post(
  "/:examenId/responder",
  authenticate,
  authorize(["alumno"]),
  async (req, res) => {
    try {
      const { respuestas } = req.body;
      const examen = await Examen.findById(req.params.examenId);

      if (!examen) {
        return res.status(404).json({ message: "Examen no encontrado" });
      }

      // Verificamos si el alumno ya respondió el examen
      const yaRespondido = examen.respuestas.some(
        (resp) => resp.alumno.toString() === req.user.id
      );
      if (yaRespondido) {
        return res
          .status(400)
          .json({ message: "Ya has respondido este examen." });
      }

      // Guardamos las respuestas del alumno
      const nuevaRespuesta = {
        alumno: req.user.id,
        respuestas: respuestas.map((respuesta) => ({
          preguntaId: respuesta.preguntaId,
          respuestaTexto: respuesta.respuestaTexto,
        })),
        corregido: false, // Se corregirá manualmente o con lógica automática después
      };

      examen.respuestas.push(nuevaRespuesta);
      await examen.save();

      res.status(200).json({ message: "Respuestas enviadas con éxito" });
    } catch (error) {
      console.error("Error al enviar respuestas:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

// 📌 Verificar si un alumno ya ha completado un examen
router.get(
  "/:examenId/completado",
  authenticate,
  authorize(["alumno"]),
  async (req, res) => {
    try {
      const examen = await Examen.findById(req.params.examenId);

      if (!examen) {
        return res.status(404).json({ message: "Examen no encontrado" });
      }

      // Verificar si el alumno ya respondió este examen
      const yaRespondido = examen.respuestas.some(
        (resp) => resp.alumno.toString() === req.user.id
      );

      res.status(200).json({ yaRespondido });
    } catch (error) {
      console.error("Error al verificar si el examen fue completado:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

module.exports = router;
