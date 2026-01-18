const axios = require('axios');
const { Exercise, ExerciseImage } = require('./models');
const { sequelize } = require('./models');

const WGER_API = 'https://wger.de/api/v2';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Función mejorada para detectar si un texto está en español
function isSpanish(text) {
  if (!text || text.trim().length === 0) return false;
  
  const textLower = text.toLowerCase();
  
  // Palabras exclusivas del alemán (para rechazar)
  const germanWords = [
    'und', 'mit', 'auf', 'zum', 'der', 'die', 'das', 'den', 
    'vom', 'zur', 'bei', 'über', 'für', 'nach', 'vor',
    'gewicht', 'übung', 'seite', 'bein', 'arm', 'rücken',
    'schulter', 'brust', 'stütz', 'heben', 'ziehen', 'drücken',
    'kopfüber', 'ellenbogen', 'unterarm', 'knie'
  ];
  
  // Palabras exclusivas del checo (para rechazar)
  const czechWords = [
    'na', 'se', 'po', 'ze', 'do', 'od', 'prkno', 'levém', 
    'pravém', 'boku', 'nohou', 'rukou', 'kolenou'
  ];
  
  // Palabras exclusivas del inglés (para rechazar)
  const englishWords = [
    'the', 'and', 'with', 'from', 'side', 'hold', 'raise',
    'push', 'pull', 'up', 'down', 'knee', 'elbow', 'overhead',
    'dumbbell', 'barbell', 'kettlebell', 'cable', 'standing',
    'seated', 'lying', 'kneeling', 'alternating', 'single',
    'double', 'arm', 'leg', 'chest', 'back', 'shoulder'
  ];
  
  // Palabras EXCLUSIVAS del español (específicas y claras)
  const spanishKeywords = [
    'abdominales', 'flexiones', 'sentadillas', 'dominadas',
    'elevaciones', 'mancuerna', 'lagartijas', 'zancadas',
    'desplantes', 'glúteos', 'gemelos', 'isquiotibiales',
    'jalón', 'pecho', 'espalda', 'hombros', 'piernas',
    'brazos', 'bíceps', 'tríceps', 'cuádriceps', 'lateral',
    'frontal', 'posterior', 'alterno', 'alternados'
  ];
  
  // Preposiciones y artículos del español
  const spanishFunctionWords = ['con', 'en', 'de', 'del', 'al', 'para', 'desde', 'hasta'];
  
  // 1. Rechazar si tiene palabras de otros idiomas
  for (const word of germanWords) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(textLower)) {
      return false;
    }
  }
  
  for (const word of czechWords) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(textLower)) {
      return false;
    }
  }
  
  for (const word of englishWords) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(textLower)) {
      return false;
    }
  }
  
  // 2. Verificar caracteres especiales del español
  const hasSpanishChars = /[áéíóúñü]/i.test(text);
  
  // 3. Contar palabras clave en español
  let spanishKeywordCount = 0;
  let spanishFunctionCount = 0;
  
  for (const word of spanishKeywords) {
    if (textLower.includes(word)) {
      spanishKeywordCount++;
    }
  }
  
  for (const word of spanishFunctionWords) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(textLower)) {
      spanishFunctionCount++;
    }
  }
  
  // 4. Criterios para aceptar como español:
  return hasSpanishChars || 
         (spanishKeywordCount >= 1 && spanishFunctionCount >= 1) ||
         spanishKeywordCount >= 2;
}

async function fetchAllPages(url, maxPages = null) {
  let results = [];
  let nextUrl = url;
  let pageCount = 0;
  
  while (nextUrl && (maxPages === null || pageCount < maxPages)) {
    try {
      const response = await axios.get(nextUrl);
      results = results.concat(response.data.results);
      nextUrl = response.data.next;
      pageCount++;
      await sleep(100);
    } catch (err) {
      console.error(`❌ Error fetching: ${err.message}`);
      nextUrl = null;
    }
  }
  
  return results;
}

const seedDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('🚀 Starting seeding (images-first strategy)...\n');

    // === PASO 1: OBTENER TODAS LAS IMÁGENES ===
    console.log('📋 Step 1: Fetching ALL exercise images...');
    console.log('   (This may take a few minutes)\n');
    
    const allImages = await fetchAllPages(`${WGER_API}/exerciseimage/?limit=200`);
    
    console.log(`✅ Found ${allImages.length} total images\n`);

    // Crear un Set con los IDs de ejercicios que tienen imágenes
    const exercisesWithImages = new Set();
    const imagesByExercise = new Map();
    
    for (const img of allImages) {
      exercisesWithImages.add(img.exercise);
      
      if (!imagesByExercise.has(img.exercise)) {
        imagesByExercise.set(img.exercise, []);
      }
      
      imagesByExercise.get(img.exercise).push({
        id: img.id,
        image_url: img.image,
        is_main: img.is_main,
        exercise_id: img.exercise
      });
    }
    
    console.log(`✅ ${exercisesWithImages.size} unique exercises have images\n`);

    // === PASO 2: OBTENER TRADUCCIONES ===
    console.log('📋 Step 2: Fetching ALL exercise translations...');
    
    const allTranslations = await fetchAllPages(`${WGER_API}/exercise-translation/?limit=200`);
    
    console.log(`✅ Found ${allTranslations.length} total translations\n`);

    // === PASO 3: FILTRAR ESPAÑOL + CON IMÁGENES ===
    console.log('📋 Step 3: Filtering Spanish exercises WITH images...');
    
    const spanishWithImages = [];
    const translationMap = new Map();
    let rejectedNoImages = 0;
    let rejectedNotSpanish = 0;
    
    for (const trans of allTranslations) {
      const hasImage = exercisesWithImages.has(trans.exercise);
      const isSpanishText = isSpanish(trans.name);
      
      if (hasImage && isSpanishText) {
        spanishWithImages.push(trans);
        
        // Guardar la mejor traducción para cada ejercicio
        if (!translationMap.has(trans.exercise) || 
            (trans.description && trans.description.length > 0)) {
          translationMap.set(trans.exercise, {
            name: trans.name,
            description: trans.description || null
          });
        }
      } else {
        if (!hasImage) rejectedNoImages++;
        if (!isSpanishText) rejectedNotSpanish++;
      }
    }
    
    console.log(`✅ Accepted: ${spanishWithImages.length} Spanish exercises with images`);
    console.log(`❌ Rejected: ${rejectedNotSpanish} (not Spanish)`);
    console.log(`❌ Rejected: ${rejectedNoImages} (no images)`);
    console.log(`✅ Unique exercises to save: ${translationMap.size}\n`);

    if (translationMap.size === 0) {
      console.error('❌ No valid exercises found!');
      return;
    }

    // Mostrar ejemplos
    console.log('📝 Sample Spanish exercises WITH images:');
    spanishWithImages.slice(0, 10).forEach((trans, idx) => {
      const imgCount = imagesByExercise.get(trans.exercise).length;
      console.log(`   ✅ ${idx + 1}. ${trans.name} (${imgCount} imagen${imgCount > 1 ? 'es' : ''})`);
    });
    console.log('');

    // === PASO 4: OBTENER DATOS BASE POR CATEGORÍA ===
    console.log('📋 Step 4: Fetching base data for filtered exercises...');
    
    const muscleCategories = [
      { id: 10, name: 'Abs' },
      { id: 8, name: 'Arms' },
      { id: 12, name: 'Back' },
      { id: 14, name: 'Calves' },
      { id: 9, name: 'Chest' },
      { id: 11, name: 'Legs' },
      { id: 13, name: 'Shoulders' }
    ];
    
    const exercisesToSave = [];
    const validExerciseIds = new Set(translationMap.keys());

    for (const category of muscleCategories) {
      try {
        console.log(`  Processing ${category.name}...`);
        
        const categoryExercises = await fetchAllPages(
          `${WGER_API}/exercise/?category=${category.id}&limit=50`
        );
        
        let validCount = 0;
        
        for (const ex of categoryExercises) {
          if (validExerciseIds.has(ex.id)) {
            const translation = translationMap.get(ex.id);
            
            exercisesToSave.push({
              id: ex.id,
              category: ex.category,
              name: translation.name,
              description: translation.description
            });
            
            validCount++;
          }
        }
        
        console.log(`  ✅ ${validCount} exercises`);
        await sleep(150);
        
      } catch (err) {
        console.warn(`  ⚠️ Error: ${err.message}`);
      }
    }

    console.log(`\n✅ Total to save: ${exercisesToSave.length}\n`);

    // === PASO 5: GUARDAR EJERCICIOS ===
    console.log('📋 Step 5: Saving exercises to database...');
    
    let savedCount = 0;
    const savedIds = [];

    for (const exerciseData of exercisesToSave) {
      try {
        const [exercise, created] = await Exercise.findOrCreate({
          where: { id: exerciseData.id },
          defaults: exerciseData
        });
        
        if (created) {
          savedCount++;
          savedIds.push(exerciseData.id);
          
          if (savedCount % 10 === 0 || savedCount === exercisesToSave.length) {
            console.log(`  ✅ ${savedCount}/${exercisesToSave.length}`);
          }
        }
        
        await sleep(20);
        
      } catch (err) {
        console.warn(`  ⚠️ Error: ${err.message}`);
      }
    }
    
    console.log(`\n✅ Saved ${savedCount} exercises\n`);

    // === PASO 6: GUARDAR IMÁGENES ===
    console.log('📋 Step 6: Saving images to database...');
    
    let imagesToSave = [];
    
    for (const exerciseId of savedIds) {
      const images = imagesByExercise.get(exerciseId);
      if (images) {
        imagesToSave = imagesToSave.concat(images);
      }
    }
    
    if (imagesToSave.length > 0) {
      await ExerciseImage.bulkCreate(imagesToSave, { ignoreDuplicates: true });
      console.log(`✅ Saved ${imagesToSave.length} images\n`);
    }

    // === VERIFICACIÓN FINAL ===
    console.log('='.repeat(70));
    console.log('🎉 SEEDING COMPLETED!');
    console.log('='.repeat(70));
    
    const totalExercises = await Exercise.count();
    const totalImages = await ExerciseImage.count();
    
    console.log(`📊 Database Stats:`);
    console.log(`   - Total Exercises: ${totalExercises}`);
    console.log(`   - Total Images: ${totalImages}`);
    console.log(`   - Ratio: ${totalImages}/${totalExercises} (${((totalImages/totalExercises)*100).toFixed(1)}%)`);
    
    // Verificar que TODOS tienen imágenes
    const exercisesWithoutImages = await Exercise.findAll({
      include: [{
        model: ExerciseImage,
        required: false
      }]
    });
    
    const withoutImagesCount = exercisesWithoutImages.filter(ex => 
      !ex.ExerciseImages || ex.ExerciseImages.length === 0
    ).length;
    
    if (withoutImagesCount > 0) {
      console.log(`   ⚠️ WARNING: ${withoutImagesCount} exercises without images found!`);
    } else {
      console.log(`   ✅ ALL exercises have images!`);
    }
    
    const samples = await Exercise.findAll({ 
      limit: 10,
      include: [{ model: ExerciseImage }]
    });
    
    console.log('\n📝 Sample exercises:');
    samples.forEach((ex, idx) => {
      const imgCount = ex.ExerciseImages ? ex.ExerciseImages.length : 0;
      const spanishCheck = isSpanish(ex.name) ? '🇪🇸' : '❌';
      const imageCheck = imgCount > 0 ? '🖼️' : '❌';
      console.log(`   ${spanishCheck} ${imageCheck} ${idx + 1}. ${ex.name} (${imgCount} img)`);
    });
    
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await sequelize.close();
    console.log('🔌 Connection closed.');
  }
};

seedDatabase();