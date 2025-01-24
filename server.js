const express = require("express");
const connectDB = require("./config/db");
const dotenv = require("dotenv");
const cors = require("cors");
const usuariosRoutes = require("./routes/usuarios"); // Ruta unificada para usuarios
const loginRoutes = require("./routes/login");
dotenv.config();

const app = express();

// Conectar a MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Rutas
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/login", loginRoutes);

// Ruta inicial
app.get("/", (req, res) => {
  res.send("API funcionando");
});

// Middleware para manejo de errores globales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Error interno del servidor" });
});

// Puerto del servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
