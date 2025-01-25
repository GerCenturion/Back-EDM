const mongoose = require("mongoose");

const MateriaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  level: {
    type: String,
    enum: ["Elemental", "Avanzado 1", "Avanzado 2", "Avanzado 3"],
    required: true,
  },
  isEnrollmentOpen: {
    type: Boolean,
    default: false,
  },
  professor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuario",
    default: null,
  },
  students: [
    {
      student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario",
      },
      status: {
        type: String,
        enum: ["Pendiente", "Aceptado", "Rechazado"],
        default: "Pendiente",
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Materia", MateriaSchema);
