const mongoose = require("mongoose");

const ExamenSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  materia: { type: mongoose.Schema.Types.ObjectId, ref: "Materia" },
  profesor: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" },
  preguntas: [
    {
      texto: { type: String, required: true },
      tipo: {
        type: String,
        enum: ["desarrollo", "multiple-choice", "audio"],
        required: true,
      },
      opciones: [{ texto: String }],
    },
  ],
  respuestas: [
    {
      alumno: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" },
      respuestas: [
        {
          preguntaId: { type: mongoose.Schema.Types.ObjectId },
          respuestaTexto: String,
          opcionSeleccionada: { type: mongoose.Schema.Types.ObjectId },
          respuestaAudioUrl: String,
          estado: {
            type: String,
            enum: ["pendiente", "aprobado", "rehacer"],
            default: "pendiente",
          },
        },
      ],
      estado: {
        type: String,
        enum: ["pendiente", "aprobado", "rehacer"],
        default: "pendiente",
      },
    },
  ],
  creadoEn: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Examen", ExamenSchema);
