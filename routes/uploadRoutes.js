const express = require("express");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
require("dotenv").config(); // Asegúrate de cargar las variables de entorno

// Configuración del cliente S3 para DigitalOcean Spaces
const s3 = new S3Client({
  region: "nyc3",
  endpoint: "https://nyc3.digitaloceanspaces.com",
  credentials: {
    accessKeyId: "DO00MRU9HK9JATVB6UJ3", // Llave de acceso desde el archivo .env
    secretAccessKey: "XPJMSKDK43dz9SCqEJWqNm71bClpf61523TS6nBqZDU", // Llave secreta desde el archivo .env
  },
});

// Configuración de Multer para manejar la carga de archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Ruta para subir un archivo
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
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
    const result = await s3.send(command);

    // Construir la URL del archivo subido
    const fileUrl = `https://${uploadParams.Bucket}.nyc3.digitaloceanspaces.com/${fileKey}`;

    // Devolver la URL del archivo subido
    return res.status(200).json({
      message: "Archivo subido con éxito",
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

module.exports = router;
