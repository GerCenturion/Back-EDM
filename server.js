const express = require("express");
const connectDB = require("./config/db");
const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
const path = require("path");
const usuariosRoutes = require("./routes/usuarios");
const loginRoutes = require("./routes/login");
const createDefaultAdmin = require("./createDefaultAdmin");
const adminRoutes = require("./routes/admin");
const materiasRoutes = require("./routes/materias");
const uploadRoutes = require("./routes/uploadRoutes"); // Ruta para subir archivos
const examenRoutes = require("./routes/examenRoutes");
const crearMateriasDefault = require("./config/materiasDefault");

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173", // Permitir solo este frontend
    credentials: true, // Importante para las sesiones y cookies
  })
);

// Validar configuración
if (!process.env.SPACES_KEY || !process.env.SPACES_SECRET) {
  console.error("Error: Falta configurar las variables de entorno para Spaces");
  process.exit(1);
}

// Conectar a MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Rutas
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/login", loginRoutes);
app.use("/api/materias", materiasRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/examenes", examenRoutes);

// Ruta inicial
app.get("/", (req, res) => {
  res.send("API funcionando");
});

// Middleware para manejo de errores globales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Error interno del servidor" });
});

// Crear datos por defecto
createDefaultAdmin();
crearMateriasDefault();

app.use("/api/admin", adminRoutes);

// Puerto del servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
