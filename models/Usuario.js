const mongoose = require("mongoose");

const UsuarioSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "El nombre es obligatorio"],
  },
  email: {
    type: String,
    required: [true, "El correo electrónico es obligatorio"],
    unique: true,
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
  phoneType: {
    type: String,
    required: function () {
      return !this.isDefaultAdmin;
    },
  },
  birthdate: {
    type: Date,
    required: function () {
      return !this.isDefaultAdmin;
    },
  },
  dni: {
    type: String,
    required: [true, "El DNI es obligatorio"],
    unique: true,
  },
  address: {
    type: String,
    required: function () {
      return !this.isDefaultAdmin;
    },
  },
  civilStatus: {
    type: String,
    required: function () {
      return !this.isDefaultAdmin;
    },
  },
  profession: {
    type: String,
    required: function () {
      return !this.isDefaultAdmin;
    },
  },
  church: {
    type: String,
    required: function () {
      return !this.isDefaultAdmin;
    },
  },
  ministerialRole: {
    type: String,
    default: "",
  },
  reason: {
    type: String,
    required: function () {
      return !this.isDefaultAdmin;
    },
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
});

module.exports = mongoose.model("Usuario", UsuarioSchema);
