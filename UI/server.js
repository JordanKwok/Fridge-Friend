import OpenAI from 'openai';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import fs from 'fs';
import csvParser from 'csv-parser';

dotenv.config(); // Load environment variables

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 8080;

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
  const csvData = data.map(item => `${item.name},${item.quantity}`).join('\n');
  try {
    fs.writeFileSync(csvFilePath, `name,quantity\n${csvData}`);
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
    res.json({ recipe: response.choices[0].message.content });
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

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
