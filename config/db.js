const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI); // Sin las opciones obsoletas
    console.log(`MongoDB Atlas conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1); // Termina el proceso si hay error
  }
};

module.exports = connectDB;
