const express = require("express");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { authenticate, authorize } = require("../middleware/authenticate");
const Examen = require("../models/Examen");
const Materia = require("../models/Materia");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const router = express.Router();

// Configuración de Multer para subir archivos a la memoria
const upload = multer({ storage: multer.memoryStorage() });

// Configuración de DigitalOcean Spaces
const s3 = new S3Client({
  region: process.env.DO_SPACES_REGION,
  endpoint: process.env.DO_SPACES_ENDPOINT,
  credentials: {
    accessKeyId: process.env.DO_SPACES_ACCESS_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET_KEY,
  },
});

// 📌 Crear un examen y asociarlo a una materia
router.post(
  "/crear",
  authenticate,
  authorize(["profesor", "admin"]),
  async (req, res) => {
    try {
      const { titulo, materia, preguntas, fechaLimite } = req.body;

      if (!titulo || !materia || !preguntas || preguntas.length === 0) {
        return res.status(400).json({
          message: "El título, la materia y las preguntas son requeridas",
        });
      }

      if (!fechaLimite) {
        return res
          .status(400)
          .json({ message: "La fecha límite es requerida" });
      }

      // Validar preguntas
      preguntas.forEach((pregunta) => {
        if (
          !["multiple-choice", "desarrollo", "audio"].includes(pregunta.tipo)
        ) {
          return res.status(400).json({
            message:
              "El tipo de pregunta debe ser 'multiple-choice', 'desarrollo' o 'audio'",
          });
        }

        if (
          pregunta.tipo === "multiple-choice" &&
          (!pregunta.opciones || pregunta.opciones.length === 0)
        ) {
          return res.status(400).json({
            message:
              "Las preguntas de selección múltiple deben tener opciones.",
          });
        }

        if (pregunta.tipo === "audio" && pregunta.opciones?.length > 0) {
          return res.status(400).json({
            message: "Las preguntas de audio no deben tener opciones.",
          });
        }
      });

      const nuevoExamen = new Examen({
        titulo,
        materia,
        profesor: req.user.id,
        fechaLimite,
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
      console.error("❌ Error al crear examen:", error);
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
      const examen = await Examen.findById(req.params.examenId)
        .populate("materia")
        .populate("respuestas.alumno", "name email") // Poblar información del alumno
        .lean(); // Convertir el resultado en objeto plano

      if (!examen) {
        return res.status(404).json({ message: "Examen no encontrado" });
      }

      // Si el usuario es un alumno, solo enviamos SUS respuestas
      if (req.user.role === "alumno") {
        examen.respuestas = examen.respuestas.filter(
          (resp) => resp.alumno._id.toString() === req.user.id
        );
      }

      res.status(200).json(examen);
    } catch (error) {
      console.error("❌ Error al obtener examen:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

// 📌 Enviar respuestas del examen
router.post(
  "/:examenId/responder",
  authenticate,
  authorize(["alumno"]),
  upload.single("archivoAudio"),
  async (req, res) => {
    try {
      const respuestas = JSON.parse(req.body.respuestas);
      const archivoAudio = req.file; // Obtener archivo de audio
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

      // 📌 Verificar fecha límite
      if (new Date() > new Date(examen.fechaLimite)) {
        return res.status(400).json({
          message:
            "La fecha límite ha pasado. No puedes completar este examen.",
        });
      }

      let audioUrl = null;
      if (archivoAudio) {
        const fileKey = `examenes/${req.params.examenId}/${uuidv4()}-${
          archivoAudio.originalname
        }`;
        const uploadParams = {
          Bucket: "escuela-de-misiones",
          Key: fileKey,
          Body: archivoAudio.buffer,
          ContentType: archivoAudio.mimetype,
          ACL: "public-read",
        };

        await s3.send(new PutObjectCommand(uploadParams));
        audioUrl = `https://${uploadParams.Bucket}.nyc3.digitaloceanspaces.com/${fileKey}`;
      }

      // Guardamos las respuestas del alumno
      const nuevaRespuesta = {
        alumno: req.user.id,
        respuestas: respuestas.map((respuesta) => ({
          preguntaId: respuesta.preguntaId,
          respuestaTexto: respuesta.respuestaTexto || "",
          opcionSeleccionada: respuesta.opcionSeleccionada || null,
          respuestaAudioUrl: respuesta.respuestaAudio ? audioUrl : null, // Guardar solo si es pregunta de audio
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

router.get(
  "/:examenId/respuestas",
  authenticate,
  authorize(["profesor", "admin"]),
  async (req, res) => {
    try {
      const examen = await Examen.findById(req.params.examenId)
        .populate("respuestas.alumno", "name email") // Poblar información del alumno
        .populate("preguntas"); // Poblar todas las preguntas del examen

      if (!examen) {
        return res.status(404).json({ message: "Examen no encontrado" });
      }

      // Asignar el texto de la pregunta a cada respuesta
      examen.respuestas.forEach((resp) => {
        resp.respuestas.forEach((r) => {
          const preguntaCompleta = examen.preguntas.find(
            (p) => p._id.toString() === r.preguntaId.toString()
          );

          if (preguntaCompleta) {
            r.preguntaTexto = preguntaCompleta.texto;
          } else {
            r.preguntaTexto = "⚠️ Pregunta no encontrada";
          }
        });
      });

      res.status(200).json(examen.respuestas);
    } catch (error) {
      console.error("❌ Error al obtener respuestas:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

router.post(
  "/:examenId/corregir/:alumnoId",
  authenticate,
  authorize(["profesor", "admin"]),
  async (req, res) => {
    try {
      const { respuestas } = req.body;
      const examen = await Examen.findById(req.params.examenId);

      if (!examen) {
        return res.status(404).json({ message: "Examen no encontrado" });
      }

      const respuestasAlumno = examen.respuestas.find(
        (resp) => resp.alumno.toString() === req.params.alumnoId
      );

      if (!respuestasAlumno) {
        return res
          .status(404)
          .json({ message: "Respuestas del alumno no encontradas" });
      }

      respuestasAlumno.respuestas = respuestas;
      respuestasAlumno.corregido = true;
      respuestasAlumno.totalPuntuacion = respuestas.reduce(
        (total, r) => total + (r.puntuacionObtenida || 0),
        0
      );

      await examen.save();

      res.status(200).json({ message: "Corrección guardada con éxito" });
    } catch (error) {
      console.error("Error al guardar corrección:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

router.get(
  "/:examenId/detalles-completos",
  authenticate,
  authorize(["profesor", "admin"]),
  async (req, res) => {
    try {
      const examen = await Examen.findById(req.params.examenId)
        .populate("materia", "name") // Poblar la materia
        .populate("profesor", "name email") // Poblar profesor
        .populate("preguntas") // Poblar preguntas
        .populate("respuestas.alumno", "name email") // Poblar alumnos
        .lean(); // Convertir a objeto JSON

      if (!examen) {
        return res.status(404).json({ message: "Examen no encontrado" });
      }

      // Asociar las respuestas con sus preguntas correspondientes
      examen.respuestas.forEach((respuesta) => {
        respuesta.respuestas = respuesta.respuestas.map((resp) => {
          const pregunta = examen.preguntas.find((p) =>
            p._id.equals(resp.preguntaId)
          );

          return {
            ...resp,
            preguntaTexto: pregunta
              ? pregunta.texto
              : "⚠️ Pregunta no encontrada",
            opciones: pregunta ? pregunta.opciones : [],
            tipo: pregunta ? pregunta.tipo : "desconocido",
          };
        });
      });

      res.status(200).json(examen);
    } catch (error) {
      console.error("❌ Error al obtener examen completo:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

router.get("/:examenId/estado/:alumnoId", authenticate, async (req, res) => {
  try {
    const { examenId, alumnoId } = req.params;

    // Buscar el examen en la base de datos
    const examen = await Examen.findById(examenId);

    if (!examen) {
      return res.status(404).json({ message: "Examen no encontrado" });
    }

    // Buscar las respuestas del alumno
    const respuestasAlumno = examen.respuestas.find(
      (resp) => resp.alumno.toString() === alumnoId
    );

    if (!respuestasAlumno) {
      return res.json({
        completado: false,
        corregido: false,
        totalPuntuacion: null,
      });
    }

    // Enviar la respuesta con el estado del examen
    res.json({
      completado: true,
      corregido: respuestasAlumno.corregido,
      totalPuntuacion: respuestasAlumno.corregido
        ? respuestasAlumno.totalPuntuacion
        : null,
    });
  } catch (error) {
    console.error("Error al verificar el estado del examen:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

module.exports = router;
