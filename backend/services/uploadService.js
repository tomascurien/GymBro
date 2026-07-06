const multer = require('multer');
const supabase = require('../config/supabase');
const path = require('path');

// 1. Configuración de Multer (Almacenamiento en Memoria)
// Guardamos el archivo en la RAM temporalmente para enviarlo a Supabase sin guardarlo en disco
const storage = multer.memoryStorage();

// Filtro de archivos: Solo permitimos imágenes y videos comunes
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 
    'video/mp4', 'video/quicktime', 'video/webm'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no soportado. Solo imágenes y videos.'), false);
  }
};

// Inicializamos Multer
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB límite (igual que Supabase Free)
  fileFilter: fileFilter
});

// 2. Función para subir a Supabase
const uploadFileToSupabase = async (file, bucketName = 'posts') => {
  try {
    // Generar nombre único: timestamp + random + extensión
    // Ej: 1715623321_832912_image.jpg
    const fileExt = path.extname(file.originalname);
    const fileName = `${Date.now()}_${Math.round(Math.random() * 1E9)}${fileExt}`;
    
    // Subir el archivo (buffer) a Supabase
    const { data, error } = await supabase
      .storage
      .from(bucketName)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      throw error;
    }

    // Obtener la URL pública para guardarla en la BD
    const { data: publicUrlData } = supabase
      .storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;

  } catch (error) {
    console.error('Error subiendo archivo a Supabase:', error.message);
    throw error;
  }
};

module.exports = {
  upload,
  uploadFileToSupabase
};