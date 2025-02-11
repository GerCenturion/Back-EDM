const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const usuariosRoutes = require("./routes/usuarios");
const loginRoutes = require("./routes/login");
const createDefaultAdmin = require("./createDefaultAdmin");
const adminRoutes = require("./routes/admin");
const materiasRoutes = require("./routes/materias");
const uploadRoutes = require("./routes/uploadRoutes");
const examenRoutes = require("./routes/examenRoutes");
const crearMateriasDefault = require("./config/materiasDefault");
const whatsappRoutes = require("./routes/whatsapp"); // 🔥 Agregar WhatsApp

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

connectDB();
app.use(express.json());

app.use("/api/usuarios", usuariosRoutes);
app.use("/api/login", loginRoutes);
app.use("/api/materias", materiasRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/examenes", examenRoutes);
app.use("/api/whatsapp", whatsappRoutes); // 🔥 Integrar WhatsApp API

app.get("/", (req, res) => {
  res.send("API funcionando");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Error interno del servidor" });
});

createDefaultAdmin();
crearMateriasDefault();
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 80;
app.listen(PORT, () =>
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`)
);
