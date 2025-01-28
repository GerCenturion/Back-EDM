const express = require("express");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const Materia = require("../models/Materia"); // Modelo de Materia
require("dotenv").config(); // Asegúrate de cargar las variables de entorno

const router = express.Router();

// Configuración del cliente S3 para DigitalOcean Spaces
const s3 = new S3Client({
  region: "nyc3",
  endpoint: "https://nyc3.digitaloceanspaces.com",
  credentials: {
    accessKeyId: process.env.SPACES_KEY, // Llave de acceso desde el archivo .env
    secretAccessKey: process.env.SPACES_SECRET, // Llave secreta desde el archivo .env
  },
});

// Configuración de Multer para manejar la carga de archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Ruta para subir un archivo y vincularlo a una materia
router.post("/upload/:materiaId", upload.single("file"), async (req, res) => {
  try {
    const { materiaId } = req.params;

    // Validar que se haya enviado un archivo
    if (!req.file) {
      return res.status(400).json({ message: "No se proporcionó un archivo." });
    }

    // Configurar los parámetros para la subida a DigitalOcean Spaces
    const fileKey = `${uuidv4()}-${req.file.originalname}`;
    const uploadParams = {
      Bucket: "escuela-de-misiones", // Cambia esto por tu Space (bucket)
      Key: fileKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: "public-read", // Permitir acceso público
    };

    // Subir el archivo al Space usando PutObjectCommand
    const command = new PutObjectCommand(uploadParams);
    await s3.send(command);

    // Construir la URL del archivo subido
    const fileUrl = `https://${uploadParams.Bucket}.nyc3.digitaloceanspaces.com/${fileKey}`;

    // Buscar la materia por ID y agregar el archivo al campo files
    const materia = await Materia.findById(materiaId);
    if (!materia) {
      return res.status(404).json({ message: "Materia no encontrada." });
    }

    materia.files.push({
      fileName: req.file.originalname,
      fileUrl,
      uploadDate: new Date(),
    });

    await materia.save();

    // Devolver la URL del archivo subido
    return res.status(200).json({
      message: "Archivo subido y vinculado con la materia con éxito",
      fileUrl,
    });
  } catch (error) {
    console.error("Error al subir archivo:", error);
    return res.status(500).json({
      message: "Error al subir archivo",
      error: error.message,
    });
  }
});

router.post("/:materiaId/classes", upload.array("files"), async (req, res) => {
  try {
    const { materiaId } = req.params;
    const { title, description, videoUrl } = req.body;

    // Validar que la materia exista
    const materia = await Materia.findById(materiaId);
    if (!materia) {
      return res.status(404).json({ message: "Materia no encontrada" });
    }

    // Subir los archivos al espacio de DigitalOcean
    const uploadedFiles = [];
    for (const file of req.files) {
      const fileKey = `${uuidv4()}-${file.originalname}`;
      const uploadParams = {
        Bucket: "escuela-de-misiones",
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: "public-read",
      };

      const command = new PutObjectCommand(uploadParams);
      await s3.send(command);

      const fileUrl = `https://${uploadParams.Bucket}.nyc3.digitaloceanspaces.com/${fileKey}`;
      uploadedFiles.push({
        fileName: file.originalname,
        fileUrl,
        uploadDate: new Date(),
      });
    }

    // Crear la nueva clase
    const newClass = {
      title,
      description,
      videoUrl,
      files: uploadedFiles,
      createdAt: new Date(),
    };

    materia.classes.push(newClass);
    await materia.save();

    res.status(201).json({
      message: "Clase creada exitosamente",
      newClass,
    });
  } catch (error) {
    console.error("Error al crear clase:", error);
    res
      .status(500)
      .json({ message: "Error al crear clase", error: error.message });
  }
});

module.exports = router;
