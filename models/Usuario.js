const mongoose = require("mongoose");

const UsuarioSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "El nombre es obligatorio"],
  },
  email: {
    type: String,
    default: "",
    unique: true,
    sparse: true, // ✅ Permite múltiples vacíos sin conflicto
  },
  profileImage: {
    type: String, // Guardaremos la URL de la imagen en la base de datos
    default: "", // Puede estar vacío inicialmente
  },
  phoneCode: {
    type: String,
    required: function () {
      return !this.isDefaultAdmin;
    },
  },
  phoneArea: {
    type: String,
    required: function () {
      return !this.isDefaultAdmin;
    },
  },
  phoneNumber: {
    type: String,
    required: function () {
      return !this.isDefaultAdmin;
    },
  },
  birthdate: {
    type: Date, // Ahora es opcional
  },
  dni: {
    type: String,
    required: [true, "El DNI es obligatorio"],
    unique: true,
  },
  legajo: {
    type: String,
    default: "",
  },
  address: {
    type: String,
    default: "",
  },
  civilStatus: {
    type: String,
    default: "",
  },
  profession: {
    type: String,
    default: "",
  },
  church: {
    type: String,
    default: "",
  },
  ministerialRole: {
    type: String,
    default: "",
  },
  reason: {
    type: String,
    default: "",
  },
  password: {
    type: String,
    required: [true, "La contraseña es obligatoria"],
  },
  role: {
    type: String,
    enum: ["admin", "profesor", "alumno"],
    default: "alumno",
  },
  isDefaultAdmin: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // 🔥 Nuevos campos para la verificación por WhatsApp
  verificationCode: {
    type: String, // Código de verificación de 6 dígitos
    default: null,
  },
  verificationCodeExpires: {
    type: Date, // Fecha de expiración del código de verificación
    default: null,
  },
  isVerified: {
    type: Boolean, // Indica si el usuario ha completado la verificación
    default: false,
  },
});

module.exports = mongoose.model("Usuario", UsuarioSchema);
