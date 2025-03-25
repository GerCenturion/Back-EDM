const mongoose = require("mongoose");

const LibretaSchema = new mongoose.Schema({
  alumno: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuario",
    required: true,
  },
  legajo: {
    type: String,
    default: "",
  },
  materia: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Materia",
    required: true,
  },
  profesor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuario",
    required: false,
  },
  estadoFinal: {
    type: String,
    enum: ["aprobado", "recursa"],
    required: true,
  },
  recibo: {
    type: String,
    default: "",
  },
  fechaDePago: {
    type: Date,
    default: null,
  },
  fechaCierre: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Libreta", LibretaSchema);
