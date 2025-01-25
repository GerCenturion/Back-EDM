const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario");

// Middleware para autenticar al usuario
const authenticate = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res
      .status(401)
      .json({ message: "Acceso denegado. Token no proporcionado." });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    console.error("Error al verificar el token:", error.message);
    res.status(400).json({ message: "Token no válido" });
  }
};

// Middleware para autorizar roles específicos
const authorize = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Acceso denegado. No tienes los permisos necesarios.",
      });
    }
    next();
  };
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Acceso denegado. No eres administrador." });
  }
  next();
};

module.exports = { authenticate, authorize, isAdmin };
