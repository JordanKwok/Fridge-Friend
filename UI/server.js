import dotenv from 'dotenv';
dotenv.config(); // Load environment variables
import OpenAI from 'openai';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import fs from 'fs';
import csvParser from 'csv-parser';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Initialize OpenAI with API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY 
});

app.use(express.static('public'));
app.use(bodyParser.json()); // For parsing application/json

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

// Handle button click
app.post('/clicked', (req, res) => {
  console.log('LOG: Button Pressed');
  res.sendStatus(200);
});

// Handle get recipe request with specific ingredients
app.post('/getRecipe', async (req, res) => {
  const { ingredients } = req.body;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: `What recipes can I make with these ingredients: ${ingredients}?` }]
    });

    // Clean up the response text
    const recipeText = response.choices[0].message.content
      .replace(/^\d+\.\s*/, '')  // Remove numbering (e.g., "1. ")
      .replace(/\nInstructions:\n/, ''); // Remove extra "Instructions" label if present

    res.json({ recipe: recipeText.trim() });
  } catch (error) {
    console.error('Error making API request:', error);
    res.status(500).send('Error making API request');
  }
});

// Endpoint to remove an ingredient
app.post('/removeIngredient', async (req, res) => {
  const { name } = req.body;
  try {
    const data = await readCSV();
    const filteredData = data.filter(item => item.name !== name);
    writeCSV(filteredData);
    res.status(200).send('Ingredient removed successfully');
  } catch (error) {
    console.error('Error removing ingredient:', error);
    res.status(500).send('Failed to remove ingredient');
  }
});

// Endpoint to edit an ingredient
app.post('/editIngredient', async (req, res) => {
  const { oldName, newName, newQuantity } = req.body;
  try {
    const data = await readCSV();
    const updatedData = data.map(item => {
      if (item.name === oldName) {
        return { name: newName, quantity: newQuantity };
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

app.use(express.json());
app.post('/api/data', (req, res) => {
  console.log(req.body); // Log the received data

  const ingredient = req.body.ingredient;
  const value = req.body.value;

  // Calculate the current date in YYYY-MM-DD format
  const currentDate = new Date();
  const formattedDate = currentDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD

  // Use the current date for adding or removing the ingredient
  const date = value === "true" ? formattedDate : req.body.date; // Use the formatted date for addition, or the date from the request for removal
  let quantity;

  const filePath = path.join(__dirname, 'public', 'Ingredients.csv'); // Path to the file

  // Read the file asynchronously
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      res.status(500).send('Error reading file');
      return;
    }
    
    let lines = data.split('\n').filter(Boolean);

    let ingredients = [];
    let dates = [];

    // Iterate through each line, skipping the header
    lines.slice(1).forEach(line => {
      let [name, date] = line.split(',');
      ingredients.push(name.trim());
      dates.push(date.trim());
    });

  // Add the ingredient with the current date
  if (value === "true") {
      ingredients.push(ingredient);
      dates.push(formattedDate);
      console.log(`Added ingredient ${ingredient}`);
  } else if (value === "false") {
     // Find all indices of the specified ingredient
     const indices = ingredients.reduce((acc, curr, index) => {
      if (curr === ingredient) acc.push(index);
      return acc;
    }, []);
    
    if (indices.length > 0) {
      // If the ingredient exists, find the oldest entry
      let oldestIndex = indices[0]; // Assume the first index is the oldest initially
      let oldestDate = dates[oldestIndex];

      for (let i = 1; i < indices.length; i++) {
        const currentIndex = indices[i];
        if (dates[currentIndex] < oldestDate) {
          oldestDate = dates[currentIndex];
          oldestIndex = currentIndex; // Update the index of the oldest entry
        }
      }

      // Remove the oldest entry
      ingredients.splice(oldestIndex, 1);
      dates.splice(oldestIndex, 1); // Also remove the corresponding date
      console.log(`Removed oldest entry of ingredient ${ingredient} with date ${oldestDate}`);
    }
  }

    let outputLines = [];
    outputLines.push('name,date');
    for (let i = 0; i < ingredients.length; i++) {
      outputLines.push(`${ingredients[i]},${dates[i]}`);
    }
    // Join the lines back together and write the file
    fs.writeFile(filePath, outputLines.join('\n'), 'utf8', (err) => {
      if (err) {
        console.error('Error writing file:', err);
        res.status(500).send('Error writing file');
        return;
      }

      // Send the response after the file has been successfully written
      res.send('Ingredient list updated successfully');
    });
  });
});


// Start the server
app.listen(port, `0.0.0.0`, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
