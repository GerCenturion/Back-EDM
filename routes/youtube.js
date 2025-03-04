const express = require("express");
const { exec } = require("child_process");

const router = express.Router();

router.get("/download", (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).json({ error: "Falta la URL del video" });
    }

    exec(`yt-dlp -g -f best "${videoUrl}"`, (error, stdout) => {
        if (error) {
            return res.status(500).json({ error: "Error al obtener el enlace de descarga" });
        }

        const downloadUrl = stdout.trim();
        res.json({ downloadUrl });
    });
});

module.exports = router;
