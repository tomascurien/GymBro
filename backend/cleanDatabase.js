const { Exercise, ExerciseImage, sequelize } = require('./models');

const cleanDatabase = async () => {
  try {
    console.log('🧹 Cleaning database...');
    
    // Eliminar todas las imágenes primero (por la relación FK)
    await ExerciseImage.destroy({ where: {} });
    console.log('✅ Deleted all exercise images');
    
    // Eliminar todos los ejercicios
    await Exercise.destroy({ where: {} });
    console.log('✅ Deleted all exercises');
    
    console.log('🎉 Database cleaned successfully!');
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
  } finally {
    await sequelize.close();
  }
};

cleanDatabase();