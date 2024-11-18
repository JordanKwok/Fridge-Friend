import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import fs from 'fs';
import csvParser from 'csv-parser';
import sqlite3 from 'sqlite3';
import http from 'http';
import { Server } from 'socket.io';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = 3000;

const categoryMap = {
  "milk": { category: "Dairy", shelfLife: 7 },
  "cheese": { category: "Dairy", shelfLife: 14 },
  "yogurt": { category: "Dairy", shelfLife: 14 },
  "cream cheese": { category: "Dairy", shelfLife: 14 },
  "apple": { category: "Fruits", shelfLife: 5 },
  "banana": { category: "Fruits", shelfLife: 5 },
  "carrot": { category: "Vegetables", shelfLife: 7 },
  "chicken": { category: "Meat", shelfLife: 4 },
  "onion": { category: "Vegetables", shelfLife: 7 },
  "cabbage": { category: "Vegetables", shelfLife: 7 },
  "bacon": { category: "Meat", shelfLife: 14 },
  "bread": { category: "Baked Goods", shelfLife: 4 },
  "cereal": { category: "Packaged Goods", shelfLife: 30 }
};

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

// Handle get recipe request
app.post('/getRecipe', (req, res) => {
  const { ingredients } = req.body;
  const selectedIngredients = ingredients.split(',').map(ing => ing.trim().toLowerCase());

  db.all('SELECT * FROM recipes', [], (err, rows) => {
    if (err) {
      console.error('Error querying the database:', err);
      res.status(500).send('Error querying the database');
      return;
    }

    const filteredRecipes = rows
      .map(recipe => {
        if (!recipe.ingredients || typeof recipe.ingredients !== 'string') return null;
        try {
          const recipeIngredients = JSON.parse(recipe.ingredients.replace(/'/g, '"')).map(ing => ing.toLowerCase());
          const matchingIngredients = recipeIngredients.filter(ing => selectedIngredients.some(selected => ing.includes(selected)));
          const extraIngredients = recipeIngredients.filter(ing => !selectedIngredients.some(selected => ing.includes(selected)));

          return {
            ...recipe,
            matchingIngredientsCount: matchingIngredients.length,
            extraIngredientsCount: extraIngredients.length,
            extraIngredients
          };
        } catch (error) {
          console.error('Error parsing ingredients:', error);
          return null;
        }
      })
      .filter(recipe => recipe && recipe.matchingIngredientsCount > 0 && recipe.extraIngredientsCount <= 2)
      .sort((a, b) => b.matchingIngredientsCount - a.matchingIngredientsCount);

    res.json({ recipes: filteredRecipes.slice(0, 5) });
  });
});

// Endpoint to remove an ingredient
app.post('/removeIngredientDate', (req, res) => {
  const { ingredient } = req.body;

  fs.readFile(csvFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      res.status(500).send('Error reading file');
      return;
    }

    const lines = data.split('\n').filter(Boolean);
    
    // Parse the lines and filter for entries that match the ingredient
    const matchingLines = lines
      .slice(1) // Skip the header line
      .map((line, index) => {
        const [name, date] = line.split(',');
        return { name: name.trim(), date: new Date(date.trim()), index: index + 1 };
      })
      .filter(item => item.name.toLowerCase() === ingredient.toLowerCase());

    // If there are matching lines, find the oldest one
    if (matchingLines.length > 0) {
      // Sort the matching lines by date in ascending order (oldest first)
      matchingLines.sort((a, b) => a.date - b.date);

      // Get the index of the oldest entry in the original lines array
      const indexToRemove = matchingLines[0].index;

      // Remove the oldest line from the lines array
      lines.splice(indexToRemove, 1);
    }

    fs.writeFile(csvFilePath, lines.join('\n'), 'utf8', (err) => {
      if (err) {
        console.error('Error writing file:', err);
        res.status(500).send('Error writing file');
        return;
      }
      res.send('Ingredient removed successfully');
    });
  });
});



// Endpoint to edit an ingredient
app.post('/editIngredient', (req, res) => {
  const { oldName, newName } = req.body;
  readCSV().then(data => {
    const updatedData = data.map(item => (item.name === oldName ? { name: newName, date: item.date } : item));
    writeCSV(updatedData);
    res.status(200).send('Ingredient updated successfully');
  }).catch(error => {
    console.error('Error editing ingredient:', error);
    res.status(500).send('Failed to edit ingredient');
  });
});

// Endpoint to add a new ingredient
app.post('/addIngredient', (req, res) => {
  const { name, date } = req.body;
  const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
  const formattedDate = formatDate(date);

  fs.appendFile(csvFilePath, `\n${capitalizedName},${formattedDate}`, 'utf8', (err) => {
    if (err) {
      console.error('Error writing to file:', err);
      res.status(500).send('Error writing to file');
      return;
    }
    res.status(200).send('Ingredient added successfully');
  });
});

// Endpoint to receive items with "true/false" status
app.post('/receiveItemsStatus', (req, res) => {
  const itemsStatus = req.body; // Example: { "Apple": true, "Banana": true }
  
  console.log('Received items with status:', itemsStatus);
  
  // Emit the sessionComplete event to notify the client
  io.emit('sessionComplete', itemsStatus);

  // Respond to the client indicating the items were received successfully
  res.send('Items received successfully without writing to CSV.');
});

// Endpoint to receive confirmed items and write to CSV
app.post('/addConfirmedItems', (req, res) => {
  const confirmedItems = req.body; // Expecting an array of { name, date } objects

  fs.readFile(csvFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading CSV file:', err);
      return res.status(500).send('Error reading CSV file');
    }

    // Prepare the new lines to be added to the CSV
    const newLines = confirmedItems.map(item => `${item.name},${item.date}`);

    // Append the new lines to the existing data
    const updatedData = data.trim() + '\n' + newLines.join('\n');

    fs.writeFile(csvFilePath, updatedData, 'utf8', (err) => {
      if (err) {
        console.error('Error writing to CSV file:', err);
        return res.status(500).send('Error writing to CSV file');
      }

      res.send('Items confirmed and added successfully.');
    });
  });
});

// Function to format the date
function formatDate(date) {
  const dateObj = new Date(date);
  const month = dateObj.toLocaleString('en-US', { month: 'short' });
  const day = String(dateObj.getDate()).padStart(2, '0');
  const year = String(dateObj.getFullYear()).slice(-2);
  return `${month}-${day}-${year}`;
}

// Socket.io setup
io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${port}`);
});
