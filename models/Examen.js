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
  fechaLimite: {
    type: Date,
    required: true,
  },
  preguntas: [
    {
      texto: { type: String, required: true },
      tipo: {
        type: String,
        enum: ["multiple-choice", "desarrollo", "audio"], // ✅ Se agregó tipo "audio"
        required: true,
      },
      opciones: [
        {
          texto: { type: String, required: false },
          puntuacion: { type: Number, required: false, min: 0, max: 10 },
        },
      ],
      puntuacion: { type: Number, required: true, min: 0, max: 10 },
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
          respuestaTexto: { type: String, required: false },
          opcionSeleccionada: {
            type: mongoose.Schema.Types.ObjectId,
            required: false,
          },
          respuestaAudioUrl: { type: String, required: false }, // ✅ Se agrega campo para almacenar URL del audio
          puntuacionObtenida: { type: Number, min: 0, max: 10, default: 0 },
        },
      ],
      corregido: { type: Boolean, default: false },
      totalPuntuacion: { type: Number, min: 0, max: 10, default: 0 },
    },
  ],
  creadoEn: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Examen", ExamenSchema);
