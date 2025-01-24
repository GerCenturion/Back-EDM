const mongoose = require("mongoose");

const UsuarioSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phoneCode: {
    type: String,
    required: true,
  },
  phoneArea: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  phoneType: {
    type: String,
    required: true,
  },
  birthdate: {
    type: Date,
    required: true,
  },
  dni: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  civilStatus: {
    type: String,
    required: true,
  },
  profession: {
    type: String,
    required: true,
  },
  church: {
    type: String,
    required: true,
  },
  ministerialRole: {
    type: String,
  },
  reason: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Usuario", UsuarioSchema);
