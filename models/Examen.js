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
      opciones: [
        {
          texto: { type: String, required: true },
          puntuacion: { type: Number, required: true, min: 0, max: 10 },
        },
      ],
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
          respuestaTexto: { type: String, required: true },
          puntuacionObtenida: { type: Number, min: 0, max: 10, default: 0 },
        },
      ],
      corregido: { type: Boolean, default: false },
      totalPuntuacion: {
        type: Number,
        min: 0,
        max: 10,
        default: 0,
      },
    },
  ],
  creadoEn: { type: Date, default: Date.now },
});

// Índice para mejorar rendimiento en búsquedas por materia
ExamenSchema.index({ materia: 1 });

module.exports = mongoose.model("Examen", ExamenSchema);
