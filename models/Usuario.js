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
    required: [true, "El código de país es obligatorio"],
  },
  phoneArea: {
    type: String,
    required: [true, "El código de área es obligatorio"],
  },
  phoneNumber: {
    type: String,
    required: [true, "El número de teléfono es obligatorio"],
  },
  phoneType: {
    type: String,
    required: [true, "El tipo de teléfono es obligatorio"],
  },
  birthdate: {
    type: Date,
    required: [true, "La fecha de nacimiento es obligatoria"],
  },
  dni: {
    type: String,
    required: [true, "El DNI es obligatorio"],
    unique: true,
  },
  address: {
    type: String,
    required: [true, "La dirección es obligatoria"],
  },
  civilStatus: {
    type: String,
    required: [true, "El estado civil es obligatorio"],
  },
  profession: {
    type: String,
    required: [true, "La profesión es obligatoria"],
  },
  church: {
    type: String,
    required: [true, "El nombre de la iglesia es obligatorio"],
  },
  ministerialRole: {
    type: String,
    default: "",
  },
  reason: {
    type: String,
    required: [true, "La razón para inscribirse es obligatoria"],
  },
  password: {
    type: String,
    required: [true, "La contraseña es obligatoria"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Usuario", UsuarioSchema);
