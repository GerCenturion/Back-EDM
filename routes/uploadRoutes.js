const express = require("express");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const router = express.Router();

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: "dk5oluny4", // Reemplaza con tu cloud_name
  api_key: "557753935384115", // Reemplaza con tu API Key
  api_secret: "85q3XM5Vn0Cdsv8Qtnm99RQnts8", // Reemplaza con tu API Secret
});

// Configuración de Multer (manejo de archivos)
const storage = multer.diskStorage({});
const upload = multer({ storage });

// Ruta para subir un archivo a Cloudinary
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No se proporcionó un archivo." });
    }

    // Subir archivo a Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "uploads", // Carpeta en Cloudinary
      public_id: req.file.originalname.split(".")[0], // Nombre del archivo sin extensión
      resource_type: "auto", // Permite subir PDFs, imágenes, etc.
    });

    res.status(200).json({
      message: "Archivo subido con éxito",
      fileUrl: result.secure_url,
    });
  } catch (error) {
    console.error("Error al subir archivo a Cloudinary:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

module.exports = router;
