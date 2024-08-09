console.log('Server-side code running');

const e = require('express');
const express = require('express');

const app = express();
const fs = require('fs');
const path = require('path');


app.use(express.static('public'));

app.listen(8080, () => {
  console.log('listening on 8080');
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/clicked', (req, res) => {
  console.log('LOG: Button Pressed');
  res.sendStatus(200);

});

// Middleware to parse JSON bodies

app.use(express.json());
app.post('/api/data', (req, res) => {
  console.log(req.body); // Log the received data

  const ingredient = req.body.ingredient;
  const value = req.body.value;

  const filePath = path.join(__dirname, 'public', 'Ingredients.csv'); // Path to the file

  // Read the file asynchronously
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      res.status(500).send('Error reading file');
      return;
    }

    let ingredients = data.split('\n').filter(Boolean); // Split the file into lines and filter out any empty lines

    if (value === "true") {
      if (!ingredients.includes(ingredient)) {
        ingredients.push(ingredient); // Add the ingredient to the list if not already present
        console.log(`Added ingredient ${ingredient}`);
      }
    } else if (value === "false") {
      ingredients = ingredients.filter(i => i !== ingredient); // Remove the ingredient from the list
      console.log(`Removed ingredient ${ingredient}`);
    }

    // Join the lines back together and write the file
    fs.writeFile(filePath, ingredients.join('\n'), 'utf8', (err) => {
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