const cloudinary = require("cloudinary").v2;

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: "dk5oluny4",
  api_key: "557753935384115",
  api_secret: "<85q3XM5Vn0Cdsv8Qtnm99RQnts8>", // Click 'View API Keys' above to copy your API secret
});

console.log("Cloudinary Config:", {
  cloud_name: "dk5oluny4",
  api_key: "557753935384115",
  api_secret: "<85q3XM5Vn0Cdsv8Qtnm99RQnts8>", // Click 'View API Keys' above to copy your API secret
});
module.exports = cloudinary;
