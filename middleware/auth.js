const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  // Obtener el token del encabezado Authorization
  const token = req.header("Authorization");

  // Verificar si no hay token
  if (!token) {
    return res.status(401).json({
      message: "Acceso denegado. Token no proporcionado.",
    });
  }

  try {
    // Verificar y decodificar el token
    const verified = jwt.verify(token, process.env.JWT_SECRET);

    // Adjuntar los datos decodificados del usuario a la solicitud
    req.user = verified;

    // Continuar con el siguiente middleware o controlador
    next();
  } catch (error) {
    console.error("Error al verificar el token:", error.message);

    // Manejo de diferentes errores de JWT
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "El token ha expirado. Por favor, inicia sesión nuevamente.",
      });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(400).json({
        message: "El token proporcionado no es válido.",
      });
    } else {
      return res.status(500).json({
        message: "Error al procesar el token.",
      });
    }
  }
};

module.exports = authenticate;
