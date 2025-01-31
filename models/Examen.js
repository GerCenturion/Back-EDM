const mongoose = require("mongoose");

const ExamenSchema = new mongoose.Schema({
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
          puntuacion: { type: Number, required: true },
        },
      ],
    },
  ],
  respuestas: [
    {
      alumno: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" },
      respuestas: [
        {
          preguntaId: mongoose.Schema.Types.ObjectId,
          respuestaTexto: String,
          puntuacionObtenida: Number,
        },
      ],
      corregido: { type: Boolean, default: false },
      totalPuntuacion: Number,
    },
  ],
  creadoEn: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Examen", ExamenSchema);
