const axios = require('axios');
const { Exercise, ExerciseImage } = require('./models');
const { sequelize } = require('./models');

const WGER_API = 'https://wger.de/api/v2';

// --- Función de pausa para no sobrecargar la API ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- Función para obtener TODAS las páginas ---
async function fetchAllPages(url) {
  let results = [];
  let nextUrl = url;
  while (nextUrl) {
    try {
      console.log(`Fetching ${nextUrl}`);
      const response = await axios.get(nextUrl);
      results = results.concat(response.data.results);
      nextUrl = response.data.next;
    } catch (err) {
      console.error(`Error fetching page ${nextUrl}: ${err.message}`);
      nextUrl = null;
    }
    await sleep(50); // Pequeña pausa entre páginas
  }
  return results;
}

const seedDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });

    // --- 1. OBTENER TODAS LAS TRADUCCIONES (NOMBRES) EN INGLÉS ---
    console.log('Fetching all exercise translations (names) in English (language=2)...');
    // Usamos el endpoint '/exercise-translation/' con el idioma Inglés (2)
    const allTranslations = await fetchAllPages(`${WGER_API}/exercise-translation/?language=2&limit=200`);
    
    // Creamos un mapa: { exerciseId => "Exercise Name" }
    const nameMap = new Map();
    for (const trans of allTranslations) {
      // Guardamos el ID del ejercicio y su nombre (el campo se llama 'name')
      nameMap.set(trans.exercise, trans.name);
    }
    console.log(`Created map with ${nameMap.size} English exercise names.`);


    // --- 2. OBTENER LOS IDs DE LOS EJERCICIOS BASE ---
    console.log('Fetching top 20 exercise IDs per muscle group...');
    const muscleCategories = [10, 8, 12, 14, 9, 11, 13];
    let baseExercises = []; 

    for (const categoryId of muscleCategories) {
      const exerciseUrl = `${WGER_API}/exercise/?category=${categoryId}&limit=20`;
      try {
        console.log(`Fetching exercise IDs for category ${categoryId}...`);
        const response = await axios.get(exerciseUrl);
        baseExercises = baseExercises.concat(response.data.results);
      } catch (err) {
        console.warn(`Could not fetch category ${categoryId}: ${err.message}`);
      }
    }

    const uniqueBaseExercises = Array.from(new Map(baseExercises.map(ex => [ex.id, ex])).values())
                                    .filter(ex => ex.id);
    
    console.log(`Found ${uniqueBaseExercises.length} unique exercise IDs.`);

    // --- 3. COMBINAR DATOS Y GUARDAR ---
    console.log('Combining info and saving exercises (one by one)...');
    
    let seededExerciseIDs = []; // Guardamos los IDs que SÍ funcionaron

    for (const baseEx of uniqueBaseExercises) {
      // Buscamos el nombre en el mapa que creamos en el Paso 1
      const exerciseName = nameMap.get(baseEx.id);

      if (exerciseName && exerciseName.length > 0) { // ¡Si SÍ encontramos un nombre!
        
        const exerciseToSave = {
          id: baseEx.id,
          category: baseEx.category,
          name: exerciseName, // Usamos el nombre de la traducción
          description: null // El modelo permite esto
        };

        try {
          await Exercise.findOrCreate({
            where: { id: exerciseToSave.id },
            defaults: exerciseToSave
          });
          
          seededExerciseIDs.push(baseEx.id); // Lo guardamos para buscar la imagen
          console.log(`✅ Saved: ${exerciseName}`);
        } catch (err) {
          console.warn(`Error saving ${exerciseName}: ${err.message}`);
        }

      } else {
        // Esto pasará si un ejercicio (ID) no tiene una traducción en inglés
        console.warn(`Skipping exercise ${baseEx.id}: No English translation found.`);
      }

      await sleep(20); // Pausa muy corta
    }
    
    console.log(`✅ Successfully seeded ${seededExerciseIDs.length} valid exercises.`);
    
    // --- 4. POPULATE IMAGES ---
    console.log('Fetching images ONLY for our seeded exercises...');
    
    let allImageData = [];

    for (const exerciseId of seededExerciseIDs) {
      try {
        const imageUrl = `${WGER_API}/exerciseimage/?exercise=${exerciseId}`;
        const response = await axios.get(imageUrl);
        
        const imagesForThisExercise = response.data.results.map(img => ({
          id: img.id,
          image_url: img.image,
          is_main: img.is_main,
          exercise_id: img.exercise
        }));

        allImageData = allImageData.concat(imagesForThisExercise);
        await sleep(50); // Pausa

TA      } catch (err) {
        console.warn(`(No images found for exercise ${exerciseId} or error)`);
      }
    }
    
    await ExerciseImage.bulkCreate(allImageData, { ignoreDuplicates: true });
    console.log(`✅ Successfully seeded ${allImageData.length} images.`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await sequelize.close();
    console.log('Database connection closed.');
  }
};

seedDatabase();