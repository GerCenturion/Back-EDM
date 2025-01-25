const express = require("express");
const { authenticate, authorize } = require("../middleware/authenticate");
const Materia = require("../models/Materia");
const Usuario = require("../models/Usuario");

const router = express.Router();

// Ruta para obtener todas las materias
router.get("/", authenticate, async (req, res) => {
  try {
    const materias = await Materia.find()
      .populate("professor", "name email role")
      .populate("students.student", "name email dni");
    res.status(200).json(materias);
  } catch (error) {
    console.error("Error al obtener materias:", error.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Ruta para obtener una materia por ID
router.get("/:id", authenticate, async (req, res) => {
  try {
    const materia = await Materia.findById(req.params.id)
      .populate("professor", "name email role")
      .populate("students.student", "name email dni");

    if (!materia) {
      return res.status(404).json({ message: "Materia no encontrada" });
    }

    res.status(200).json(materia);
  } catch (error) {
    console.error("Error al obtener materia:", error.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Ruta para crear una nueva materia (solo admin)
router.post("/create", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    const { name, level } = req.body;

    if (!name || !level) {
      return res.status(400).json({
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

// Ruta para actualizar una materia por ID
router.put("/:id", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    const { isEnrollmentOpen, professor } = req.body;

    const materia = await Materia.findById(req.params.id);

    if (!materia) {
      return res.status(404).json({ message: "Materia no encontrada" });
    }

    if (isEnrollmentOpen !== undefined)
      materia.isEnrollmentOpen = isEnrollmentOpen;
    if (professor !== undefined) materia.professor = professor;

    await materia.save();

    res.status(200).json({ message: "Materia actualizada con éxito", materia });
  } catch (error) {
    console.error("Error al actualizar materia:", error.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Ruta para inscribir a un alumno en una materia
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

      if (
        materia.students.some(
          (student) => student.student.toString() === alumnoId
        )
      ) {
        return res
          .status(400)
          .json({ message: "El alumno ya está inscrito en esta materia" });
      }

      materia.students.push({ student: alumnoId });
      await materia.save();

      res.status(200).json({ message: "Alumno inscrito con éxito", materia });
    } catch (error) {
      console.error("Error al inscribir alumno:", error.message);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

// Ruta para habilitar o deshabilitar inscripciones a una materia
router.put(
  "/habilitar-inscripcion/:id",
  authenticate,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const { habilitar } = req.body;
      if (typeof habilitar !== "boolean") {
        return res
          .status(400)
          .json({ message: "El campo 'habilitar' debe ser un booleano" });
      }

      const materia = await Materia.findById(req.params.id);

      if (!materia) {
        return res.status(404).json({ message: "Materia no encontrada" });
      }

      materia.isEnrollmentOpen = habilitar;
      await materia.save();

      const estado = habilitar ? "habilitadas" : "deshabilitadas";
      res.status(200).json({
        message: `Las inscripciones para la materia han sido ${estado}`,
        materia,
      });
    } catch (error) {
      console.error("Error al cambiar estado de inscripción:", error.message);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

// Ruta para asignar un profesor a una materia (solo admin)
router.put(
  "/asignar-profesor/:id",
  authenticate,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const { profesorId } = req.body;

      const materia = await Materia.findById(req.params.id);
      if (!materia) {
        return res.status(404).json({ message: "Materia no encontrada" });
      }

      const profesor = await Usuario.findById(profesorId);
      if (!profesor) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      // Si el usuario no es admin, se asegura de que tenga el rol de profesor
      if (profesor.role !== "admin" && profesor.role !== "profesor") {
        profesor.role = "profesor";
        await profesor.save();
      }

      materia.professor = profesorId;
      await materia.save();

      res.status(200).json({
        message: `Profesor ${profesor.name} asignado a la materia ${materia.name} con éxito`,
        materia,
      });
    } catch (error) {
      console.error("Error al asignar profesor:", error.message);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

// Ruta para eliminar una materia
router.delete("/:id", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    const materia = await Materia.findById(req.params.id);

    if (!materia) {
      return res.status(404).json({ message: "Materia no encontrada." });
    }

    await materia.deleteOne();

    res
      .status(200)
      .json({ message: `Materia "${materia.name}" eliminada con éxito.` });
  } catch (error) {
    console.error("Error al eliminar materia:", error.message);
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

// Ruta para solicitar inscripción
router.post("/solicitar-inscripcion/:id", authenticate, async (req, res) => {
  try {
    const materia = await Materia.findById(req.params.id);

    if (!materia) {
      return res.status(404).json({ message: "Materia no encontrada" });
    }

    // Verificar si la inscripción está habilitada
    if (!materia.isEnrollmentOpen) {
      return res.status(403).json({
        message: "La inscripción para esta materia no está habilitada",
      });
    }

    // Verificar si el estudiante ya solicitó inscripción
    const alreadyRequested = materia.students.some(
      (student) => student.student.toString() === req.user.id
    );

    if (alreadyRequested) {
      return res
        .status(400)
        .json({ message: "Ya has solicitado inscripción en esta materia" });
    }

    materia.students.push({ student: req.user.id, status: "Pendiente" });
    await materia.save();

    res.status(200).json({
      message: "Solicitud de inscripción enviada con éxito.",
      materia,
    });
  } catch (error) {
    console.error("Error al solicitar inscripción:", error.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Ruta para verificar el estado de inscripción
router.get("/:id/estado-inscripcion", authenticate, async (req, res) => {
  try {
    const materia = await Materia.findById(req.params.id);

    if (!materia) {
      return res.status(404).json({ message: "Materia no encontrada" });
    }

    const student = materia.students.find(
      (s) => s.student.toString() === req.user.id
    );

    if (!student) {
      return res.status(200).json({ status: null }); // No inscrito
    }

    res.status(200).json({ status: student.status });
  } catch (error) {
    console.error("Error al verificar estado de inscripción:", error.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.put(
  "/gestionar-inscripcion/:materiaId",
  authenticate,
  authorize(["profesor", "admin"]),
  async (req, res) => {
    try {
      const { alumnoId, status } = req.body;
      if (!["Pendiente", "Aceptado", "Rechazado"].includes(status)) {
        return res
          .status(400)
          .json({
            message: "Estado no válido: Pendiente, Aceptado o Rechazado",
          });
      }

      const materia = await Materia.findById(req.params.materiaId);
      if (!materia) {
        return res.status(404).json({ message: "Materia no encontrada" });
      }

      const student = materia.students.find(
        (student) => student.student.toString() === alumnoId
      );
      if (!student) {
        return res
          .status(404)
          .json({ message: "Solicitud de inscripción no encontrada" });
      }

      student.status = status;
      await materia.save();

      res.status(200).json({
        message: `Solicitud de inscripción ${status.toLowerCase()} con éxito`,
        materia,
      });
    } catch (error) {
      console.error("Error al gestionar inscripción:", error.message);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

module.exports = router;
