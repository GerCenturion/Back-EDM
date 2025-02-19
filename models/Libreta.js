const mongoose = require("mongoose");

const LibretaSchema = new mongoose.Schema({
  alumno: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuario",
    required: true,
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
  estadoFinal: {
    type: String,
    enum: ["aprobado", "recursa"],
    required: true,
  },
  fechaCierre: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Libreta", LibretaSchema);
