const bcrypt = require("bcryptjs");
const Usuario = require("./models/Usuario");

const createDefaultAdmin = async () => {
  try {
    const {
      DEFAULT_ADMIN_NAME,
      DEFAULT_ADMIN_EMAIL,
      DEFAULT_ADMIN_DNI,
      DEFAULT_ADMIN_PASSWORD,
    } = process.env;

    if (
      !DEFAULT_ADMIN_NAME ||
      !DEFAULT_ADMIN_EMAIL ||
      !DEFAULT_ADMIN_DNI ||
      !DEFAULT_ADMIN_PASSWORD
    ) {
      console.error(
        "Las variables de entorno para el administrador por defecto no están completas."
      );
      return;
    }

    // Verificar si ya existe un administrador por defecto
    const existingAdmin = await Usuario.findOne({ isDefaultAdmin: true });
    if (existingAdmin) {
      console.log("El administrador por defecto ya existe.");
      return;
    }

    // Encriptar la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, salt);

    // Crear administrador por defecto
    const admin = new Usuario({
      name: DEFAULT_ADMIN_NAME,
      email: DEFAULT_ADMIN_EMAIL,
      dni: DEFAULT_ADMIN_DNI,
      password: hashedPassword,
      role: "admin",
      isDefaultAdmin: true,
    });

    await admin.save();
    console.log("Administrador por defecto creado exitosamente.");
  } catch (error) {
    console.error(
      "Error al crear el administrador por defecto:",
      error.message
    );
  }
};

module.exports = createDefaultAdmin;
