import sqlite3 from 'sqlite3';
import fs from 'fs';
import csvParser from 'csv-parser';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'recipes.db');

const db = new sqlite3.Database(dbPath);
const csvFilePath = path.join(__dirname, 'recipe.csv'); 

// Function to create the recipes table
function createTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      ingredients TEXT NOT NULL,
      instructions TEXT NOT NULL,
      image_name TEXT
    );
  `;
  db.run(createTableQuery, (err) => {
    if (err) {
      console.error('Error creating table:', err);
    } else {
      console.log('Recipes table created or already exists');
      populateDatabase();
    }
  });
}

// Function to populate the database from the CSV file
function populateDatabase() {
  fs.createReadStream(csvFilePath)
    .pipe(csvParser())
    .on('data', (row) => {
      const { Title, Ingredients, Instructions, Image_Name } = row;
      const insertQuery = `
        INSERT INTO recipes (title, ingredients, instructions, image_name)
        VALUES (?, ?, ?, ?)
      `;
      db.run(insertQuery, [Title, Ingredients, Instructions, Image_Name], (err) => {
        if (err) {
          console.error('Error inserting data:', err);
        }
      });
    })
    .on('end', () => {
      console.log('Data imported successfully');
    });
}

// Create the table and populate the database
createTable();
