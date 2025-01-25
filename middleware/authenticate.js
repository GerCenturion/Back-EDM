const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario");

// Middleware para autenticar al usuario
const authenticate = async (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res
      .status(401)
      .json({ message: "Acceso denegado. Token no proporcionado." });
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1] // Si usa "Bearer ", extrae solo el token
    : authHeader; // Si no tiene "Bearer", asume que es el token puro

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Usuario.findById(verified.id);

    if (!user) {
      return res.status(401).json({ message: "Usuario no encontrado." });
    }

    req.user = user; // Adjunta los datos completos del usuario
    next();
  } catch (error) {
    console.error("Error al verificar el token:", error.message);

    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "El token ha expirado. Inicia sesión nuevamente." });
    }

    return res.status(403).json({ message: "Token no válido." });
  }
};

// Middleware para autorizar roles específicos
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Acceso denegado. No tienes los permisos necesarios.",
      });
    }
    next();
  };
};

// Middleware para verificar si el usuario es admin
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Acceso denegado. No eres administrador." });
  }
  next();
};

module.exports = { authenticate, authorize, isAdmin };
