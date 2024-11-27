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
import fetch from 'node-fetch';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = 3000;

app.use(express.static('public'));
app.use(express.json());
app.use(bodyParser.json());

let operationQueue = Promise.resolve();

function queueOperation(operation) {
  operationQueue = operationQueue.then(() => operation());
  return operationQueue;
}

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
  "Dark Chocolate Hazelnut Bar": { category: "Packaged Goods", shelfLife: 30 },
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

const csvFilePath = path.join(__dirname, 'public', 'Ingredients.csv');

// Function to read CSV data
function readCSV() {
  return new Promise((resolve, reject) => {
    const results = [];
    
    // Read and normalize the file
    const rawData = fs.readFileSync(csvFilePath, 'utf8');
    const normalizedData = rawData.replace(/\r?\n/g, '\r\n'); // Normalize line endings

    // Create a readable stream from the normalized data
    const readableStream = require('stream').Readable.from(normalizedData);

    readableStream
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}
// Function to write data back to CSV
function writeCSV(data) {
  const csvData = data.map(item => `${item.name},${item.date}`).join('\r\n');
  try {
    const header = 'name,date';
    const content = `${header}\r\n${csvData}`;
    fs.writeFileSync(csvFilePath, content.trim()); // Ensure no trailing newline
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

    // Split by lines, using a more flexible approach for newlines
    const lines = data.split(/\r?\n/).filter(Boolean);
    
    // Parse the lines and find matching entries for the ingredient
    let header = lines.shift(); // Remove the header line
    const matchingLines = lines
      .map((line, index) => {
        const [name, date] = line.split(',');
        return { name: name.trim(), date: new Date(date.trim()), index: index };
      })
      .filter(item => item.name.toLowerCase() === ingredient.toLowerCase());

    // If there are matching lines, find the oldest one
    if (matchingLines.length > 0) {
      // Sort matching lines by date (ascending order)
      matchingLines.sort((a, b) => a.date - b.date);

      // Get the index of the oldest entry
      const indexToRemove = matchingLines[0].index;

      // Remove the oldest line from the lines array
      lines.splice(indexToRemove, 1);
    } else {
      return res.status(404).send('Ingredient not found');
    }

    // Add the header back and join the lines
    const updatedData = [header, ...lines].join('\n');

    // Write the updated data back to the CSV file
    fs.writeFile(csvFilePath, updatedData, 'utf8', (err) => {
      if (err) {
        console.error('Error writing file:', err);
        res.status(500).send('Error writing file');
        return;
      }
      res.send('Ingredient removed successfully');
    });
  });
});

// Function to fetch product name from barcode using Open Food Facts API
async function fetchProductNameFromBarcode(barcode) {
  const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;

  try {
    const response = await fetch(url);
    if (response.status === 200) {
      const productData = await response.json();
      if (productData && productData.product) {
        return productData.product.product_name || `Unknown Product (${barcode})`;
      }
    }
  } catch (error) {
    console.error(`Error fetching product info for barcode ${barcode}:`, error);
  }
  return `Unknown Product (${barcode})`;
}

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

  fs.appendFile(csvFilePath, `\r\n${capitalizedName},${formattedDate}`, 'utf8', (err) => {
    if (err) {
      console.error('Error writing to file:', err);
      res.status(500).send('Error writing to file');
      return;
    }
    res.status(200).send('Ingredient added successfully');
  });
});

app.get('/getProductNameFromBarcode/:barcode', async (req, res) => {
  const { barcode } = req.params;
  const productName = await fetchProductNameFromBarcode(barcode);
  res.send({ name: productName });
});

// Endpoint to receive confirmed items and write to CSV
app.post('/addConfirmedItems', (req, res) => {
  queueOperation(() => {
    return new Promise((resolve, reject) => {
      const confirmedItems = req.body; // Expecting an array of { name, date } objects

      fs.readFile(csvFilePath, 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading CSV file:', err);
          res.status(500).send('Error reading CSV file');
          return reject(err);
        }

        // Prepare the new lines to be added to the CSV
        const newLines = confirmedItems.map(item => `${item.name},${item.date}`);

        // Append the new lines to the existing data
        const updatedData = data.trim() + '\r\n' + newLines.join('\r\n');

        fs.writeFile(csvFilePath, updatedData, 'utf8', (err) => {
          if (err) {
            console.error('Error writing to CSV file:', err);
            res.status(500).send('Error writing to CSV file');
            return reject(err);
          }

          resolve('Items confirmed and added successfully.');
        });
      });
    })
    .then(message => {
      res.send(message);
    })
    .catch(err => {
      console.error('Error:', err);
      res.status(500).send('Error processing confirmed items');
    });
  });
});

// Endpoint to remove confirmed items from CSV
app.post('/removeConfirmedItems', (req, res) => {
  queueOperation(() => {
    return new Promise((resolve, reject) => {
      const itemsToRemove = req.body; // Expecting an array of { name } objects

      if (!Array.isArray(itemsToRemove) || itemsToRemove.some(item => !item.name)) {
        return res.status(400).send('Invalid input format. Expecting an array of objects with "name" property.');
      }

      fs.readFile(csvFilePath, 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading CSV file:', err);
          return reject(res.status(500).send('Error reading CSV file'));
        }

        // Split lines using a flexible approach for newlines
        const lines = data.split(/\r?\n/).filter(Boolean);
        const header = lines.shift(); // Remove the header line
        const items = lines.map(line => line.split(','));

        // Iterate over each item to be removed and remove the oldest entry
        itemsToRemove.forEach(itemToRemove => {
          const itemName = itemToRemove.name.trim().toLowerCase();
          let oldestIndex = -1;
          let oldestDate = new Date();

          for (let i = 0; i < items.length; i++) {
            const [name, date] = items[i];
            if (name.trim().toLowerCase() === itemName) {
              const currentDate = new Date(date.trim());
              if (currentDate < oldestDate) {
                oldestDate = currentDate;
                oldestIndex = i;
              }
            }
          }

          // If an item was found, remove it
          if (oldestIndex !== -1) {
            items.splice(oldestIndex, 1);
          }
        });

        // Reconstruct the updated CSV data
        const updatedData = [header, ...items.map(item => item.join(','))].join('\n');

        fs.writeFile(csvFilePath, updatedData, 'utf8', (err) => {
          if (err) {
            console.error('Error writing to CSV file:', err);
            return reject(res.status(500).send('Error writing to CSV file'));
          }

          resolve('Items removed successfully.');
        });
      });
    })
    .then(message => {
      res.send(message);
    })
    .catch(err => {
      console.error('Error:', err);
      res.status(500).send('Error processing removal of items');
    });
  });
});

// In-memory notification queue
const notificationQueue = {};

// Create an object to store userId to socket mapping
const userSockets = {};

// On connection, store the socket against the userId
io.on('connection', (socket) => {
  // Assuming userId is passed from client during connection (e.g., via query string)
  const userId = socket.handshake.query.userId;

  if (userId) {
    userSockets[userId] = socket;

    // Handle disconnection - remove the socket from the mapping
    socket.on('disconnect', () => {
      delete userSockets[userId];
    });
  }
});

// Endpoint to trigger sessionComplete notification
app.post('/triggerSessionComplete', (req, res) => {
  const { userId, session_start, newItems } = req.body;

  if (!userId) {
    return res.status(400).send('User ID is required.');
  }

  const userSocket = userSockets[userId];

  if (userSocket) {
    // If the user is online, send the notification immediately
    userSocket.emit('sessionComplete', { session_start, newItems });
    res.status(200).send('Notification sent successfully.');
  } else {
    // If the user is not online, add to queue
    queueNotification(userId, { session_start, newItems });
    res.status(200).send('User is not online, notification has been queued.');
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('A user connected');
  const userId = socket.handshake.query.userId; 

  if (userId) {
    // Map userId to the socket
    userSockets[userId] = socket;

    // Send any pending notifications to the user
    if (notificationQueue[userId] && notificationQueue[userId].length > 0) {
      notificationQueue[userId].forEach(notification => {
        socket.emit('sessionComplete', notification);
      });
      // Clear the queue after sending
      notificationQueue[userId] = [];
    }
  }

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected');
    if (userId) {
      delete userSockets[userId];
    }
  });
});

// Store a new notification in the queue if user is not active
function queueNotification(userId, notification) {
  if (!notificationQueue[userId]) {
    notificationQueue[userId] = [];
  }
  notificationQueue[userId].push(notification);
}

// Function to format the date
function formatDate(date) {
  const dateObj = new Date(date);
  const month = dateObj.toLocaleString('en-US', { month: 'short' });
  const day = String(dateObj.getDate()).padStart(2, '0');
  const year = String(dateObj.getFullYear()).slice(-2);
  return `${month}-${day}-${year}`;
}

server.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${port}`);
});
