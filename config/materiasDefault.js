const Materia = require("../models/Materia");

const materiasDefault = [
  // Nivel Elemental
  { name: "Evangelización y Crecimiento “A”", level: "Elemental" },
  { name: "Evangelización y Crecimiento “B”", level: "Elemental" },
  { name: "Panorama Bíblico “A”", level: "Elemental" },
  { name: "Panorama Bíblico “B”", level: "Elemental" },
  {
    name: "Las Bases Bíblicas de la Evangelización Mundial",
    level: "Elemental",
  },
  { name: "Análisis Hechos de los Apóstoles “A”", level: "Elemental" },
  { name: "Análisis Hechos de los Apóstoles “B”", level: "Elemental" },
  { name: "Doctrinas Básicas “A”", level: "Elemental" },
  { name: "Doctrinas Básicas “B”", level: "Elemental" },

  // Nivel Avanzado 1
  { name: "Análisis Pentateuco “A”", level: "Avanzado 1" },
  { name: "Análisis Pentateuco “B”", level: "Avanzado 1" },
  { name: "Análisis Epístolas a los Hebreos", level: "Avanzado 1" },
  { name: "Análisis Epístolas Romanos “A”", level: "Avanzado 1" },
  { name: "Análisis Epístolas Romanos “B”", level: "Avanzado 1" },
  { name: "Análisis Epístolas Paulinas “A”", level: "Avanzado 1" },
  { name: "Análisis Epístolas Paulinas “B”", level: "Avanzado 1" },
  { name: "Análisis Epístolas Generales “A”", level: "Avanzado 1" },
  { name: "Análisis Epístolas Generales “B”", level: "Avanzado 1" },

  // Nivel Avanzado 2
  { name: "Análisis Apocalipsis “A”", level: "Avanzado 2" },
  { name: "Análisis Apocalipsis “B”", level: "Avanzado 2" },
  { name: "Bibliología I", level: "Avanzado 2" },
  { name: "Bibliología II", level: "Avanzado 2" },
  { name: "Análisis Libros Históricos “A”", level: "Avanzado 2" },
  { name: "Análisis Libros Históricos “B”", level: "Avanzado 2" },
  { name: "Análisis del Movimiento Cristiano Global", level: "Avanzado 2" },
  { name: "Análisis Libros Poéticos “A”", level: "Avanzado 2" },
  { name: "Análisis Libros Poéticos “B”", level: "Avanzado 2" },

  // Nivel Avanzado 3
  { name: "Homilética “A”", level: "Avanzado 3" },
  { name: "Homilética “B”", level: "Avanzado 3" },
  { name: "Teología Pastoral y Liderazgo “A”", level: "Avanzado 3" },
  { name: "Teología Pastoral y Liderazgo “B”", level: "Avanzado 3" },
  { name: "Análisis Libros Proféticos “A”", level: "Avanzado 3" },
  { name: "Análisis Libros Proféticos “B”", level: "Avanzado 3" },
  { name: "Vida de Cristo “A”", level: "Avanzado 3" },
  { name: "Vida de Cristo “B”", level: "Avanzado 3" },
  { name: "Ocultismo y Liberación", level: "Avanzado 3" },
];

const crearMateriasDefault = async () => {
  try {
    for (const materia of materiasDefault) {
      const existe = await Materia.findOne({ name: materia.name });
      if (!existe) {
        await Materia.create(materia);
      }
    }
    console.log("Materias predeterminadas creadas o ya existentes.");
  } catch (error) {
    console.error("Error al crear materias predeterminadas:", error.message);
  }
};

module.exports = crearMateriasDefault;
