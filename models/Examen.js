const mongoose = require("mongoose");

const ExamenSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: [true, "El título del examen es obligatorio"],
    trim: true,
  },
  materia: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Materia",
    required: true,
  },
  profesor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuario",
    required: true,
  },
  preguntas: [
    {
      texto: { type: String, required: true },
      tipo: {
        type: String,
        enum: ["multiple-choice", "desarrollo"],
        required: true,
      }, // ✅ Se agrega tipo de pregunta
      opciones: [
        {
          texto: { type: String, required: false }, // Opcional solo si es "multiple-choice"
          puntuacion: { type: Number, required: false, min: 0, max: 10 }, // Opcional solo si es "multiple-choice"
        },
      ],
      puntuacion: { type: Number, required: true, min: 0, max: 10 }, // Para calcular la nota del examen
    },
  ],
  respuestas: [
    {
      alumno: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario",
        required: true,
      },
      respuestas: [
        {
          preguntaId: { type: mongoose.Schema.Types.ObjectId, required: true },
          respuestaTexto: { type: String, required: false }, // ❓ Puede estar vacío si es de opción múltiple
          opcionSeleccionada: {
            type: mongoose.Schema.Types.ObjectId,
            required: false,
          }, // 🔄 ID de la opción elegida si es "multiple-choice"
          puntuacionObtenida: { type: Number, min: 0, max: 10, default: 0 },
        },
      ],
      corregido: { type: Boolean, default: false },
      totalPuntuacion: { type: Number, min: 0, max: 10, default: 0 },
    },
  ],

  creadoEn: { type: Date, default: Date.now },
});

// Índice para mejorar rendimiento en búsquedas por materia
ExamenSchema.index({ materia: 1 });

module.exports = mongoose.model("Examen", ExamenSchema);
