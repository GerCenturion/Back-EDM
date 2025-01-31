const mongoose = require("mongoose");

const MateriaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "El nombre de la materia es obligatorio"],
    trim: true, // Elimina espacios innecesarios al principio y al final
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
        required: true, // Asegura que siempre se almacene un ID de estudiante válido
      },
      status: {
        type: String,
        enum: ["Pendiente", "Aceptado", "Rechazado"],
        default: "Pendiente",
      },
    },
  ],
  files: [
    {
      fileName: {
        type: String,
        required: true,
      },
      fileUrl: {
        type: String,
        required: true,
      },
      uploadDate: {
        type: Date,
        default: Date.now, // Fecha de la subida
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
  name: {
    type: String,
    required: [true, "El nombre de la materia es obligatorio"],
    trim: true,
    unique: true,
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
        required: true,
      },
      status: {
        type: String,
        enum: ["Pendiente", "Aceptado", "Rechazado"],
        default: "Pendiente",
      },
    },
  ],
  files: [
    {
      fileName: String,
      fileUrl: String,
      uploadDate: Date,
    },
  ],
  videos: [
    {
      url: { type: String, required: true },
      title: { type: String, required: true },
    },
  ],
  classes: [
    {
      title: { type: String, required: true },
      description: String,
      videoUrl: String, // Para URLs de videos de YouTube
      files: [
        {
          fileName: String,
          fileUrl: String,
          uploadDate: Date,
        },
      ],
      createdAt: { type: Date, default: Date.now },
    },
  ],
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Middleware para actualizar `updatedAt` antes de guardar
MateriaSchema.pre("save", function (next) {
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }
  next();
});

// Índice compuesto para búsqueda más eficiente y evitar duplicados
MateriaSchema.index({ name: 1, level: 1 }, { unique: true });

// Manejo de errores de índices únicos
MateriaSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoServerError" && error.code === 11000) {
    next(new Error("Ya existe una materia con el mismo nombre y nivel."));
  } else {
    next(error);
  }
});

// Middleware para eliminar estudiantes automáticamente si una materia es eliminada
MateriaSchema.pre("remove", async function (next) {
  try {
    // Ejemplo: puedes implementar notificaciones a los estudiantes aquí
    console.log(`Materia ${this.name} eliminada. Procesar notificaciones.`);
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("Materia", MateriaSchema);
