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
const upload = multer({
  storage: multer.memoryStorage(),
});

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

      // 📌 Validar preguntas usando `for...of` para poder hacer `return`
      for (const pregunta of preguntas) {
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
      }

      // 📌 Crear el examen si todas las validaciones pasaron
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

      return res
        .status(201)
        .json({ message: "Examen creado con éxito", examen: examenGuardado });
    } catch (error) {
      console.error("❌ Error al crear examen:", error);
      if (!res.headersSent) {
        return res.status(500).json({ message: "Error interno del servidor" });
      }
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
  upload.array("archivoAudio", 10), // 📌 Permitir hasta 10 archivos de audio
  async (req, res) => {
    try {
      console.log("🔹 Recibiendo solicitud para responder examen...");
      console.log("🔹 Archivos recibidos:", req.files);
      console.log("🔹 Cuerpo de la petición (req.body):", req.body);
      // 📌 Parsear respuestas y obtener archivos de audio subidos
      const respuestas = JSON.parse(req.body.respuestas);
      let archivosAudio = req.files || [];

      archivosAudio = archivosAudio.filter(
        (file) => file.mimetype === "audio/webm"
      );

      const examen = await Examen.findById(req.params.examenId);

      if (!examen) {
        return res.status(404).json({ message: "Examen no encontrado" });
      }

      const materiaId = examen.materia.toString();

      // 📌 Verificar si el alumno ya respondió el examen
      const yaRespondido = examen.respuestas.some(
        (resp) => resp.alumno.toString() === req.user.id
      );
      if (yaRespondido) {
        return res
          .status(400)
          .json({ message: "Ya has respondido este examen." });
      }

      // 📌 Verificar que la fecha límite no haya pasado
      if (new Date() > new Date(examen.fechaLimite).setHours(23, 59, 59, 999)) {
        return res.status(400).json({
          message:
            "La fecha límite ha pasado. No puedes completar este examen.",
        });
      }

      // 📌 Mapeamos archivos de audio a sus respectivas preguntas
      let audioUrls = {};
      if (archivosAudio.length > 0) {
        await Promise.all(
          archivosAudio.map(async (archivo) => {
            const fileKey = `materias/${materiaId}/examenes/${
              req.params.examenId
            }/${uuidv4()}-${archivo.originalname}`;

            const uploadParams = {
              Bucket: "escuela-de-misiones",
              Key: fileKey,
              Body: archivo.buffer,
              ContentType: archivo.mimetype,
              ACL: "public-read",
            };

            await s3.send(new PutObjectCommand(uploadParams));

            // 📌 Asociar la URL con el archivo subido
            audioUrls[
              archivo.originalname
            ] = `https://${uploadParams.Bucket}.nyc3.digitaloceanspaces.com/${fileKey}`;
          })
        );
      }

      console.log("🟢 URLs de los audios subidos:", audioUrls);

      // 📌 Asociar respuestas con las URLs de audio correctas
      const nuevaRespuesta = {
        alumno: req.user.id,
        respuestas: respuestas.map((respuesta) => {
          let audioUrl = null;

          // 📌 Buscar el archivo de audio correspondiente a la pregunta
          const archivoAudio = archivosAudio.find(
            (file) => file.originalname === `audio_${respuesta.preguntaId}.webm`
          );

          if (archivoAudio) {
            audioUrl = audioUrls[archivoAudio.originalname] || null;
          }

          return {
            preguntaId: respuesta.preguntaId,
            respuestaTexto: respuesta.respuestaTexto || "",
            opcionSeleccionada: respuesta.opcionSeleccionada || null,
            respuestaAudioUrl: audioUrl, // ✅ Guardar la URL de audio correcta
            estado: "realizado",
          };
        }),
        estado: "realizado",
        corregido: false,
      };

      // 📌 Guardar respuesta en la base de datos
      examen.respuestas.push(nuevaRespuesta);
      await examen.save();

      res.status(200).json({ message: "Respuestas enviadas con éxito" });
    } catch (error) {
      console.error("❌ Error al enviar respuestas:", error);
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
      const { correcciones } = req.body;

      if (!Array.isArray(correcciones) || correcciones.length === 0) {
        return res
          .status(400)
          .json({ message: "No se enviaron correcciones válidas." });
      }

      const examen = await Examen.findById(req.params.examenId);
      if (!examen) {
        return res.status(404).json({ message: "Examen no encontrado." });
      }

      const respuestaAlumno = examen.respuestas.find(
        (resp) => resp.alumno.toString() === req.params.alumnoId
      );

      if (!respuestaAlumno) {
        return res
          .status(404)
          .json({ message: "Respuestas del alumno no encontradas." });
      }

      // Aplicar correcciones a cada respuesta
      respuestaAlumno.respuestas.forEach((r) => {
        const correccion = correcciones.find(
          (c) => c.preguntaId === r.preguntaId.toString()
        );
        if (correccion) {
          r.estado = correccion.estado; // "aprobado" o "rehacer"
        }
      });

      // Si alguna respuesta es "rehacer", el estado general del examen es "rehacer"
      respuestaAlumno.estado = respuestaAlumno.respuestas.some(
        (r) => r.estado === "rehacer"
      )
        ? "rehacer"
        : "aprobado";

      await examen.save();
      res.status(200).json({ message: "Correcciones guardadas con éxito." });
    } catch (error) {
      console.error("Error al guardar corrección:", error);
      res.status(500).json({ message: "Error interno del servidor." });
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

router.get(
  "/:examenId/estado-detallado/:alumnoId",
  authenticate,
  async (req, res) => {
    try {
      const { examenId, alumnoId } = req.params;

      // Buscar el examen
      const examen = await Examen.findById(examenId);

      if (!examen) {
        return res.status(404).json({ message: "Examen no encontrado" });
      }

      // Buscar las respuestas del alumno en este examen
      const respuestaAlumno = examen.respuestas.find(
        (resp) => resp.alumno.toString() === alumnoId
      );

      let estadoGeneral = "pendiente";
      let corregido = false;
      let completado = false;

      if (respuestaAlumno) {
        completado = true;
        corregido = respuestaAlumno.estado !== "pendiente";
        estadoGeneral = respuestaAlumno.estado;
      }

      res.json({
        completado,
        corregido,
        estadoGeneral, // "pendiente", "aprobado", "rehacer"
        fechaLimite: examen.fechaLimite || "No especificada",
      });
    } catch (error) {
      console.error("❌ Error al obtener estado detallado del examen:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

// 📌 Obtener un examen para rehacer (solo las preguntas que deben corregirse)
router.get(
  "/:examenId/rehacer",
  authenticate,
  authorize(["alumno"]),
  async (req, res) => {
    try {
      const examen = await Examen.findById(req.params.examenId)
        .populate("materia", "name")
        .populate("preguntas")
        .lean();

      if (!examen) {
        return res.status(404).json({ message: "Examen no encontrado" });
      }

      // Buscar las respuestas del alumno en este examen
      const respuestaAlumno = examen.respuestas.find(
        (resp) => resp.alumno.toString() === req.user.id
      );

      if (!respuestaAlumno) {
        return res
          .status(404)
          .json({ message: "No tienes respuestas para este examen." });
      }

      // Filtrar solo las preguntas que deben rehacerse
      const preguntasRehacer = respuestaAlumno.respuestas
        .filter((r) => r.estado === "rehacer")
        .map((r) => {
          const preguntaCompleta = examen.preguntas.find((p) =>
            p._id.equals(r.preguntaId)
          );
          return preguntaCompleta
            ? { ...preguntaCompleta, estado: "rehacer" }
            : null;
        })
        .filter(Boolean);

      if (preguntasRehacer.length === 0) {
        return res.status(400).json({
          message: "No tienes preguntas que necesiten ser rehechas.",
        });
      }

      res.status(200).json({
        examenId: examen._id,
        titulo: examen.titulo,
        materia: examen.materia,
        preguntas: preguntasRehacer,
      });
    } catch (error) {
      console.error("❌ Error al obtener examen para rehacer:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

router.post(
  "/:examenId/enviar-revision",
  authenticate,
  authorize(["alumno"]),
  upload.array("archivoAudio", 10),
  async (req, res) => {
    try {
      console.log("🔹 Recibiendo solicitud para enviar revisión...");
      console.log("🔹 Archivos recibidos:", req.files);
      console.log("🔹 Cuerpo de la petición (req.body):", req.body);

      const respuestas = JSON.parse(req.body.respuestas);
      console.log("🔹 Respuestas parseadas:", respuestas);

      let archivosAudio = req.files || [];
      archivosAudio = archivosAudio.filter(
        (file) => file.mimetype === "audio/webm"
      );

      const examen = await Examen.findById(req.params.examenId);
      if (!examen) {
        console.error("❌ Examen no encontrado.");
        return res.status(404).json({ message: "Examen no encontrado" });
      }

      const respuestaAlumno = examen.respuestas.find(
        (resp) => resp.alumno.toString() === req.user.id
      );

      if (!respuestaAlumno) {
        console.error("❌ Respuestas del alumno no encontradas.");
        return res
          .status(404)
          .json({ message: "No tienes respuestas previas en este examen." });
      }

      console.log(
        "🟢 Ignorando fecha límite, permitiendo envío de correcciones."
      );

      const materiaId = examen.materia.toString();

      let audioUrls = {};
      if (archivosAudio.length > 0) {
        await Promise.all(
          archivosAudio.map(async (archivo) => {
            const fileKey = `materias/${materiaId}/examenes/${
              req.params.examenId
            }/${uuidv4()}-${archivo.originalname}`;

            const uploadParams = {
              Bucket: "escuela-de-misiones",
              Key: fileKey,
              Body: archivo.buffer,
              ContentType: archivo.mimetype,
              ACL: "public-read",
            };

            await s3.send(new PutObjectCommand(uploadParams));
            audioUrls[
              archivo.originalname
            ] = `https://${uploadParams.Bucket}.nyc3.digitaloceanspaces.com/${fileKey}`;
          })
        );
      }

      console.log("🟢 URLs de los audios subidos:", audioUrls);

      respuestaAlumno.respuestas = respuestaAlumno.respuestas.map((r) => {
        const nuevaRespuesta = respuestas.find(
          (resp) => resp.preguntaId === r.preguntaId.toString()
        );

        if (!nuevaRespuesta) return r;

        let audioUrl = r.respuestaAudioUrl;
        const archivoAudio = archivosAudio.find(
          (file) =>
            file.originalname === `audio_${nuevaRespuesta.preguntaId}.webm`
        );

        if (archivoAudio) {
          audioUrl = audioUrls[archivoAudio.originalname] || null;
        }

        return {
          preguntaId: r.preguntaId,
          respuestaTexto: nuevaRespuesta.respuestaTexto || r.respuestaTexto,
          opcionSeleccionada:
            nuevaRespuesta.opcionSeleccionada || r.opcionSeleccionada,
          respuestaAudioUrl: audioUrl,
          estado: "realizado",
        };
      });

      respuestaAlumno.estado = "realizado";
      await examen.save();

      console.log("✅ Correcciones guardadas correctamente.");
      res.status(200).json({ message: "Correcciones enviadas con éxito" });
    } catch (error) {
      console.error("❌ Error al enviar correcciones:", error);
      res.status(500).json({ message: "Error interno del servidor", error });
    }
  }
);

module.exports = router;
