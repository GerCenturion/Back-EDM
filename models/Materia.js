const mongoose = require("mongoose");

const MateriaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "El nombre de la materia es obligatorio"],
    trim: true, // Elimina espacios innecesarios
    unique: true, // Asegura que no se repita el nombre
  },
  level: {
    type: String,
    enum: ["Elemental", "Avanzado 1", "Avanzado 2", "Avanzado 3"],
    required: [true, "El nivel de la materia es obligatorio"],
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
  updatedAt: {
    type: Date,
    default: Date.now, // Fecha de la última modificación
  },
  createdAt: {
    type: Date,
    default: Date.now, // Fecha de creación
  },
});

// Middleware para actualizar `updatedAt` antes de guardar
MateriaSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Índice compuesto para búsqueda más rápida
MateriaSchema.index({ name: 1, level: 1 }, { unique: true });

module.exports = mongoose.model("Materia", MateriaSchema);
