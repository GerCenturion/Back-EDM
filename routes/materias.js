const express = require("express");
const { authenticate, authorize } = require("../middleware/authenticate");
const Materia = require("../models/Materia");
const Usuario = require("../models/Usuario");
const Libreta = require("../models/Libreta");
const Examen = require("../models/Examen");
const router = express.Router();
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();

// 📌 Configuración del cliente S3 para DigitalOcean Spaces
const s3 = new S3Client({
  region: process.env.DO_SPACES_REGION,
  endpoint: process.env.DO_SPACES_ENDPOINT,
  credentials: {
    accessKeyId: process.env.DO_SPACES_ACCESS_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET_KEY,
  },
});
// 📌 ✅ RUTA PARA OBTENER TODAS LAS LIBRETAS
router.get(
  "/libretas",
  authenticate,
  authorize(["admin", "profesor"]),
  async (req, res) => {
    try {
      const libretas = await Libreta.find()
        .populate("alumno", "name email")
        .populate("materia", "name level")
        .populate("profesor", "name");

      res.status(200).json(libretas);
    } catch (error) {
      console.error("Error al obtener las libretas:", error.message);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

router.get(
  "/libreta/:alumnoId",
  authenticate,
  authorize(["alumno"]),
  async (req, res) => {
    try {
      const libreta = await Libreta.find({ alumno: req.params.alumnoId })
        .populate("materia", "name level")
        .populate("profesor", "name");

      res.status(200).json(libreta);
    } catch (error) {
      console.error("Error al obtener la libreta:", error.message);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

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

// 📌 Obtener una materia con sus exámenes completos
router.get("/completo/:id", authenticate, async (req, res) => {
  try {
    const materia = await Materia.findById(req.params.id)
      .populate("professor", "name email role")
      .populate("students.student", "name email dni")
      .populate({
        path: "examenes",
        model: "Examen",
        select: "_id titulo profesor preguntas",
      });

    if (!materia) {
      return res.status(404).json({ message: "Materia no encontrada" });
    }

    console.log("Materia obtenida con exámenes:", materia);
    res.status(200).json(materia);
  } catch (error) {
    console.error("Error al obtener materia:", error);
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
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { isEnrollmentOpen, professor } = req.body;
    const materia = await Materia.findById(req.params.id);

    if (!materia) {
      return res.status(404).json({ message: "Materia no encontrada" });
    }

    // Permitir a los admins modificar cualquier materia, pero los profesores solo pueden modificar las suyas
    if (
      req.user.role !== "admin" &&
      materia.professor.toString() !== req.user.id
    ) {
      return res
        .status(403)
        .json({ message: "No tienes permisos para modificar esta materia" });
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
        return res.status(400).json({
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
// Agregar un video a una materia
router.post(
  "/:id/agregar-video",
  authenticate,
  authorize(["admin", "profesor"]),
  async (req, res) => {
    try {
      const { url, title } = req.body;
      if (!url || !title) {
        return res
          .status(400)
          .json({ message: "Se requieren la URL y el título del video." });
      }

      const materia = await Materia.findById(req.params.id);
      if (!materia) {
        return res.status(404).json({ message: "Materia no encontrada." });
      }

      materia.videos.push({ url, title });
      await materia.save();

      res.status(200).json({ message: "Video agregado con éxito", materia });
    } catch (error) {
      console.error("Error al agregar video:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

// Eliminar un video de una materia
router.delete(
  "/:id/eliminar-video",
  authenticate,
  authorize(["admin", "profesor"]),
  async (req, res) => {
    try {
      const { url } = req.body;
      const materia = await Materia.findById(req.params.id);

      if (!materia) {
        return res.status(404).json({ message: "Materia no encontrada." });
      }

      const newVideos = materia.videos.filter((video) => video.url !== url);

      if (newVideos.length === materia.videos.length) {
        return res
          .status(404)
          .json({ message: "Video no encontrado en la materia." });
      }

      materia.videos = newVideos;
      await materia.save();

      res.status(200).json({ message: "Video eliminado con éxito", materia });
    } catch (error) {
      console.error("Error al eliminar video:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

// 📌 Ruta para cerrar una materia y generar la libreta de notas
router.put(
  "/cerrar/:id",
  authenticate,
  authorize(["profesor", "admin"]),
  async (req, res) => {
    try {
      const materia = await Materia.findById(req.params.id)
        .populate("students.student")
        .populate("professor")
        .populate("examenes");

      if (!materia) {
        return res.status(404).json({ message: "Materia no encontrada." });
      }

      if (!materia.isEnrollmentOpen) {
        return res
          .status(400)
          .json({ message: "Esta materia ya está deshabilitada." });
      }

      // 📌 Guardar estado en la libreta
      for (let student of materia.students) {
        if (!student.student) continue;

        const examenes = await Examen.find({ materia: materia._id });

        // 📌 Determinar estado final: "aprobado" o "recursa"
        let estadoFinal = "aprobado";
        for (let examen of examenes) {
          const respuestaAlumno = examen.respuestas.find(
            (r) => r.alumno.toString() === student.student._id.toString()
          );

          if (
            !respuestaAlumno ||
            respuestaAlumno.estadoGeneral !== "aprobado"
          ) {
            estadoFinal = "recursa";
            break;
          }
        }

        await Libreta.create({
          alumno: student.student._id,
          materia: materia._id,
          profesor: materia.professor._id,
          estadoFinal,
          fechaCierre: new Date(),
        });
      }

      // 📌 Deshabilitar la materia
      materia.isEnrollmentOpen = false;
      await materia.save();

      // 📌 Eliminar todos los archivos y carpetas de DigitalOcean
      try {
        // 1️⃣ Eliminar archivos individuales de la materia
        for (const file of materia.files) {
          const fileName = file.fileUrl.split("/").pop();
          await s3.send(
            new DeleteObjectCommand({
              Bucket: "escuela-de-misiones",
              Key: fileName,
            })
          );
          console.log(`🗑 Archivo eliminado: ${fileName}`);
        }

        // 2️⃣ Eliminar la carpeta de exámenes
        const examenesFolder = `examenes/${materia._id}/`;
        const listadoArchivos = await s3.send(
          new ListObjectsV2Command({
            Bucket: "escuela-de-misiones",
            Prefix: examenesFolder,
          })
        );

        if (listadoArchivos.Contents.length > 0) {
          const archivosAEliminar = listadoArchivos.Contents.map((file) => ({
            Key: file.Key,
          }));

          await s3.send(
            new DeleteObjectsCommand({
              Bucket: "escuela-de-misiones",
              Delete: { Objects: archivosAEliminar },
            })
          );

          console.log(`🗑 Carpeta de exámenes eliminada: ${examenesFolder}`);
        }
      } catch (error) {
        console.error("❌ Error al eliminar archivos de DigitalOcean:", error);
      }

      // 📌 Limpiar la base de datos
      materia.files = [];
      materia.videos = [];
      await materia.save();

      // 📌 Eliminar todos los exámenes de la materia
      await Examen.deleteMany({ materia: materia._id });

      // 📌 Eliminar todos los estudiantes inscritos
      materia.students = [];
      await materia.save();

      res.status(200).json({
        message:
          "Materia deshabilitada, estados finales guardados y archivos eliminados con éxito.",
      });
    } catch (error) {
      console.error("❌ Error al cerrar materia:", error.message);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

// 📌 Obtener una materia con sus exámenes completos
router.get("/:id", authenticate, async (req, res) => {
  try {
    const materia = await Materia.findById(req.params.id)
      .populate("professor", "name email role")
      .populate("students.student", "name email dni")
      .populate({
        path: "examenes",
        model: "Examen",
        select: "_id titulo profesor preguntas",
      });

    if (!materia) {
      return res.status(404).json({ message: "Materia no encontrada" });
    }

    console.log("Materia obtenida con exámenes:", materia);
    res.status(200).json(materia);
  } catch (error) {
    console.error("Error al obtener materia:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

module.exports = router;
