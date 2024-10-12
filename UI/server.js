import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import fs from 'fs';
import csvParser from 'csv-parser';
import sqlite3 from 'sqlite3';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Connect to SQLite Database
const dbPath = path.join(__dirname, 'recipes.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

app.use(express.static('public'));
app.use(bodyParser.json());

const csvFilePath = path.join(__dirname, 'public', 'Ingredients.csv');

// Function to read CSV data
function readCSV() {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(csvFilePath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

// Function to write data back to CSV
function writeCSV(data) {
  const csvData = data.map(item => `${item.name},${item.date}`).join('\n');
  try {
    fs.writeFileSync(csvFilePath, `name,date\n${csvData}`);
  } catch (error) {
    console.error('Error writing to CSV file:', error);
  }
}

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle get recipe request with specific ingredients
app.post('/getRecipe', async (req, res) => {
  const { ingredients } = req.body;
  const selectedIngredients = ingredients.split(',').map(ing => ing.trim().toLowerCase());

  try {
    // Query the database for all recipes
    const db = new sqlite3.Database('recipes.db');
    db.all('SELECT * FROM recipes', [], (err, rows) => {
      if (err) {
        console.error('Error querying the database:', err);
        res.status(500).send('Error querying the database');
        return;
      }

      // Filter recipes based on the ingredients
      const filteredRecipes = rows
        .map(recipe => {
          if (!recipe.ingredients || typeof recipe.ingredients !== 'string') {
            // Skip if ingredients are missing or not a string
            return null;
          }

          try {
            // Parse the ingredients string into an array
            const recipeIngredients = JSON.parse(recipe.ingredients.replace(/'/g, '"')).map(ing => ing.toLowerCase());
            const matchingIngredients = recipeIngredients.filter(ing =>
              selectedIngredients.some(selected => ing.includes(selected))
            );
            const extraIngredients = recipeIngredients.filter(ing =>
              !selectedIngredients.some(selected => ing.includes(selected))
            );

            return {
              ...recipe,
              recipeIngredients,
              extraIngredients,
              matchingIngredientsCount: matchingIngredients.length,
              extraIngredientsCount: extraIngredients.length
            };
          } catch (parseError) {
            console.error('Error parsing ingredients:', parseError);
            return null; // Skip this recipe if there's an error
          }
        })
        .filter(recipe => recipe !== null && recipe.matchingIngredientsCount > 0 && recipe.extraIngredientsCount <= 2) // Limit to recipes with matching ingredients and 2 or fewer extra ingredients
        .sort((a, b) => b.matchingIngredientsCount - a.matchingIngredientsCount); // Sort by the most matching ingredients

      // Limit the result to the top 5 recipes
      const topRecipes = filteredRecipes.slice(0, 5);

      res.json({ recipes: topRecipes });
    });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).send('Error processing request');
  }
});

// Endpoint to remove a specific ingredient by name and date
app.post('/removeIngredientDate', async (req, res) => {
  const { ingredient, date } = req.body;

  const filePath = path.join(__dirname, 'public', 'Ingredients.csv');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return res.status(500).send('Error reading file');
    }

    let lines = data.split('\n').filter(Boolean);
    let ingredients = lines.slice(1).map(line => line.split(',')[0].trim());
    let dates = lines.slice(1).map(line => line.split(',')[1].trim());

    const matchingIndices = ingredients.reduce((acc, name, idx) => {
      if (name === ingredient && dates[idx] === date) acc.push(idx);
      return acc;
    }, []);

    if (matchingIndices.length) {
      let indexToRemove = matchingIndices[0]; // Only removing the first found match
      ingredients.splice(indexToRemove, 1);
      dates.splice(indexToRemove, 1);
    }

    const updatedData = ['name,date', ...ingredients.map((ing, i) => `${ing},${dates[i]}`)].join('\n');

    fs.writeFile(filePath, updatedData, 'utf8', (err) => {
      if (err) {
        console.error('Error writing file:', err);
        return res.status(500).send('Error writing file');
      }

      res.send('Ingredient list updated successfully');
    });
  });
});


// Endpoint to edit an ingredient
app.post('/editIngredient', async (req, res) => {
  const { oldName, newName } = req.body;
  try {
    const data = await readCSV();
    const updatedData = data.map(item => {
      if (item.name === oldName) {
        return { name: newName };
      }
      return item;
    });
    writeCSV(updatedData);
    res.status(200).send('Ingredient updated successfully');
  } catch (error) {
    console.error('Error editing ingredient:', error);
    res.status(500).send('Failed to edit ingredient');
  }
});

// Function to format the date as "MMM DD, YY"
function formatDate(date) {
  const options = { month: 'short', day: '2-digit', year: '2-digit' };
  return date.toLocaleDateString('en-US', options).replace(' ', '-').replace(', ', '-');
}

app.use(express.json());
app.post('/api/data', (req, res) => {
  const ingredient = req.body.ingredient;
  const value = req.body.value;

  const currentDate = new Date();
  const formattedDate = formatDate(currentDate);

  const filePath = path.join(__dirname, 'public', 'Ingredients.csv');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      res.status(500).send('Error reading file');
      return;
    }

    let lines = data.split('\n').filter(Boolean);
    let ingredients = [];
    let dates = [];

    lines.slice(1).forEach(line => {
      let [name, date] = line.split(',');
      ingredients.push(name.trim());
      dates.push(date.trim());
    });

    if (value === "true") {
      ingredients.push(ingredient);
      dates.push(formattedDate);
    } else if (value === "false") {
      const indices = ingredients.reduce((acc, curr, index) => {
        if (curr === ingredient) acc.push(index);
        return acc;
      }, []);

      if (indices.length > 0) {
        let oldestIndex = indices[0];
        let oldestDate = dates[oldestIndex];

        for (let i = 1; i < indices.length; i++) {
          const currentIndex = indices[i];
          if (dates[currentIndex] < oldestDate) {
            oldestDate = dates[currentIndex];
            oldestIndex = currentIndex;
          }
        }

        ingredients.splice(oldestIndex, 1);
        dates.splice(oldestIndex, 1);
      }
    }

    let outputLines = ['name,date'];
    for (let i = 0; i < ingredients.length; i++) {
      outputLines.push(`${ingredients[i]},${dates[i]}`);
    }

    fs.writeFile(filePath, outputLines.join('\n'), 'utf8', (err) => {
      if (err) {
        console.error('Error writing file:', err);
        res.status(500).send('Error writing file');
        return;
      }

      res.send('Ingredient list updated successfully');
    });
  });
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${port}`);
});
