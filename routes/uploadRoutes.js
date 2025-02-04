const express = require("express");
const multer = require("multer");
const {
  S3Client,
  DeleteObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const Materia = require("../models/Materia");
const Usuario = require("../models/Usuario");
const { authenticate } = require("../middleware/authenticate");
require("dotenv").config();

// Configuración del cliente S3 para DigitalOcean Spaces
const s3 = new S3Client({
  region: "nyc3",
  endpoint: "https://nyc3.digitaloceanspaces.com",
  credentials: {
    accessKeyId: "DO00MRU9HK9JATVB6UJ3", // Llave de acceso desde el archivo .env
    secretAccessKey: "XPJMSKDK43dz9SCqEJWqNm71bClpf61523TS6nBqZDU", // Llave secreta desde el archivo .env
  },
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/upload/:materiaId", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No se proporcionó un archivo." });
    }

    const materia = await Materia.findById(req.params.materiaId);
    if (!materia) {
      return res.status(404).json({ message: "Materia no encontrada" });
    }

    const fileKey = `${uuidv4()}-${req.file.originalname}`;
    const uploadParams = {
      Bucket: "escuela-de-misiones",
      Key: fileKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: "public-read",
    };

    await s3.send(new PutObjectCommand(uploadParams));

    const fileUrl = `https://${uploadParams.Bucket}.nyc3.digitaloceanspaces.com/${fileKey}`;

    materia.files.push({ fileUrl, fileName: req.file.originalname });
    await materia.save();

    res.status(200).json({ message: "Archivo subido con éxito", fileUrl });
  } catch (error) {
    console.error("Error al subir archivo:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.delete("/delete-file/:materiaId", async (req, res) => {
  try {
    const { fileUrl } = req.body; // URL del archivo a eliminar
    const materia = await Materia.findById(req.params.materiaId);

    if (!materia) {
      return res.status(404).json({ message: "Materia no encontrada" });
    }

    // Extraer el nombre del archivo de la URL
    const fileName = fileUrl.split("/").pop();

    // Eliminar el archivo de DigitalOcean Spaces
    const deleteParams = {
      Bucket: "escuela-de-misiones",
      Key: fileName,
    };

    await s3.send(new DeleteObjectCommand(deleteParams));

    // Eliminar el archivo de la base de datos
    materia.files = materia.files.filter((file) => file.fileUrl !== fileUrl);
    await materia.save();

    res.status(200).json({ message: "Archivo eliminado con éxito" });
  } catch (error) {
    console.error("Error al eliminar archivo:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// 📌 Ruta para subir una nueva foto de perfil
router.post(
  "/subir-foto",
  authenticate,
  upload.single("image"),
  async (req, res) => {
    try {
      const usuario = await Usuario.findById(req.user.id);
      if (!usuario) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      if (!req.file) {
        return res
          .status(400)
          .json({ message: "No se proporcionó una imagen" });
      }

      // Si el usuario ya tiene una foto de perfil, eliminar la anterior
      if (usuario.profileImage) {
        const fileName = usuario.profileImage.split("/").pop();
        const deleteParams = {
          Bucket: "escuela-de-misiones",
          Key: fileName,
        };
        await s3.send(new DeleteObjectCommand(deleteParams));
      }

      // Subir nueva imagen
      const fileKey = `profile-${uuidv4()}-${req.file.originalname}`;
      const uploadParams = {
        Bucket: "escuela-de-misiones",
        Key: fileKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        ACL: "public-read",
      };

      await s3.send(new PutObjectCommand(uploadParams));
      const imageUrl = `https://${uploadParams.Bucket}.nyc3.digitaloceanspaces.com/${fileKey}`;

      // Actualizar el perfil del usuario con la nueva URL
      usuario.profileImage = imageUrl;
      await usuario.save();

      res
        .status(200)
        .json({ message: "Imagen subida correctamente", imageUrl });
    } catch (error) {
      console.error("Error al subir la foto de perfil:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

// 📌 Ruta para eliminar la foto de perfil
router.delete("/eliminar-foto", authenticate, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.user.id);
    if (!usuario || !usuario.profileImage) {
      return res
        .status(400)
        .json({ message: "No hay foto de perfil para eliminar" });
    }

    // Extraer el nombre del archivo de la URL
    const fileName = usuario.profileImage.split("/").pop();

    // Eliminar la foto de DigitalOcean Spaces
    const deleteParams = {
      Bucket: "escuela-de-misiones",
      Key: fileName,
    };
    await s3.send(new DeleteObjectCommand(deleteParams));

    // Eliminar la foto de la base de datos
    usuario.profileImage = "";
    await usuario.save();

    res.status(200).json({ message: "Foto de perfil eliminada con éxito" });
  } catch (error) {
    console.error("Error al eliminar la foto de perfil:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

module.exports = router;
