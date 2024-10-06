document.addEventListener('DOMContentLoaded', function() {
  // Clear localStorage on page load
  localStorage.removeItem('selectedIngredients');

  // Fetch and display ingredients
  let selectedIngredients = new Set(JSON.parse(localStorage.getItem('selectedIngredients')) || []);
  let expandedIngredients = new Set(JSON.parse(localStorage.getItem('expandedIngredients')) || []); // Store expanded ingredients
  // Periodically fetch ingredients without resetting the show dates state
  setInterval(fetchIngredients, 1000);
  
  function fetchIngredients() {
    fetch('Ingredients.csv')
      .then(response => response.text())
      .then(text => {
        Papa.parse(text, {
          header: true,
          complete: function(results) {
            displayIngredients(results.data);
          },
          error: function(error) {
            console.error('Error parsing CSV:', error);
          }
        });
      })
      .catch(error => console.error('Error fetching CSV:', error));
  }

  function displayIngredients(data) {
    const ingredientsList = document.getElementById('ingredientsList');
    if (!ingredientsList) {
      console.error('Element with ID "ingredientsList" not found.');
      return;
    }
  
    // Clear the ingredients list before populating it
    ingredientsList.innerHTML = '';
  
    // Create a map to aggregate ingredients by name and count them
    const ingredientCountMap = {};
  
    data.forEach(item => {
      // If the ingredient name already exists, increment its count
      if (ingredientCountMap[item.name]) {
        ingredientCountMap[item.name].count += 1;
        ingredientCountMap[item.name].dates.push(item.date); // Add the date to the list of dates for that ingredient
      } else {
        // If it's a new ingredient, add it to the map with an initial count of 1 and store the date
        ingredientCountMap[item.name] = {
          count: 1,
          dates: [item.date] // Store the date for each ingredient
        };
      }
    });
  
    // Iterate over the aggregated ingredients and display them
    Object.keys(ingredientCountMap).forEach(name => {
      const ingredientData = ingredientCountMap[name];
      const count = ingredientData.count;
      const dates = ingredientData.dates;
  
      const itemDiv = document.createElement('div');
      itemDiv.classList.add('ingredient-item');
  
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `ingredient-${name}`;
      checkbox.classList.add('ingredient-checkbox');
      checkbox.checked = selectedIngredients.has(name);
  
      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.textContent = `${name} (${count})`; // Display the ingredient name with the count
  
      // Create a div that will contain the date boxes (initially hidden or shown based on state)
      const datesContainer = document.createElement('div');
      datesContainer.classList.add('dates-container');
      
      // Check if this ingredient is in the expandedIngredients set to maintain the visibility state
      if (expandedIngredients.has(name)) {
        datesContainer.style.display = 'block';
      } else {
        datesContainer.style.display = 'none';
      }
  
      // Create a box for each date with a remove button, and append to the datesContainer
      dates.forEach((date) => {
        const dateBox = document.createElement('div');
        dateBox.classList.add('date-box');
        const dateText = document.createElement('span');
        dateBox.textContent = `${date}`; // Display the date in the box
  
        // Add a remove button for each individual date
        const dateRemoveButton = document.createElement('button');
        dateRemoveButton.textContent = 'X';
        dateRemoveButton.classList.add('date-remove-button');
        dateRemoveButton.addEventListener('click', function(event) {
          event.stopPropagation(); // Prevent triggering the parent div click
          removeIngredientDate(name, date); // Function to remove the specific date for this ingredient
        });
        dateBox.appendChild(dateText);
        dateBox.appendChild(dateRemoveButton); // Append remove button to each date box
        datesContainer.appendChild(dateBox);
      });
  
      // Add a small button for showing/hiding dates
      const showDatesButton = document.createElement('button');
      showDatesButton.textContent = expandedIngredients.has(name) ? 'Hide Dates' : 'Show Dates';
      showDatesButton.classList.add('show-dates-button');
  
      // Add click event to toggle the visibility of the datesContainer
      showDatesButton.addEventListener('click', function(event) {
        event.stopPropagation(); // Prevent clicking the entire div
        const isHidden = datesContainer.style.display === 'none';
        datesContainer.style.display = isHidden ? 'block' : 'none'; // Toggle visibility
        showDatesButton.textContent = isHidden ? 'Hide Dates' : 'Show Dates'; // Toggle button text
        // Update expandedIngredients based on the toggle state
        if (isHidden) {
          expandedIngredients.add(name);
        } else {
          expandedIngredients.delete(name);
        }
        localStorage.setItem('expandedIngredients', JSON.stringify(Array.from(expandedIngredients)));
      });
  
      // Prevent the datesContainer from collapsing when interacting with its content
      datesContainer.addEventListener('click', function(event) {
        event.stopPropagation(); // Prevent event from bubbling up to parent
      });
  
      checkbox.addEventListener('change', function() {
        if (checkbox.checked) {
          selectedIngredients.add(name);
        } else {
          selectedIngredients.delete(name);
        }
        localStorage.setItem('selectedIngredients', JSON.stringify(Array.from(selectedIngredients)));
      });
  
      const editButton = document.createElement('button');
      editButton.textContent = 'Edit';
      editButton.classList.add('edit-button');
      editButton.addEventListener('click', function() {
        editIngredient({
          name: name,
        });
      });
  
      // Append elements to the div
      itemDiv.appendChild(checkbox);
      itemDiv.appendChild(label);
      itemDiv.appendChild(showDatesButton); // Add the show dates button
      itemDiv.appendChild(datesContainer);  // Add the collapsible dates section
      itemDiv.appendChild(editButton);
      ingredientsList.appendChild(itemDiv);
    });
  }
  



// Function to remove an ingredient date
function removeIngredientDate(ingredientName, date) {
  // Send a request to the server to remove this specific ingredient with the given date
  fetch('/removeIngredientDate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ingredient: ingredientName, date: date }),
  })
  .then(response => {
      if (response.ok) {
        fetchIngredients();
      } else {
        console.error('Failed to remove ingredient');
      }
    })
    .catch(error => console.error('Error removing ingredient:', error));
  }


  function clearCheckboxesOnLoad() {
    const checkboxes = document.querySelectorAll('.ingredient-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false; 
    });
  }

  // function removeIngredient(ingredientName) {
  //   fetch('/removeIngredient', {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({ name: ingredientName }),
  //   })
  //   .then(response => {
  //     if (response.ok) {
  //       fetchIngredients();
  //     } else {
  //       console.error('Failed to remove ingredient');
  //     }
  //   })
  //   .catch(error => console.error('Error removing ingredient:', error));
  // }

  function editIngredient(ingredient) {
    const newName = prompt(`Edit name for ${ingredient.name}:`, ingredient.name);

    if (newName && newQuantity !== null) {
      fetch('/editIngredient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ oldName: ingredient.name, newName }),
      })
      .then(response => {
        if (response.ok) {
          fetchIngredients();
        } else {
          console.error('Failed to edit ingredient');
        }
      })
      .catch(error => console.error('Error editing ingredient:', error));
    }
  }

  document.getElementById('learnMoreButton')?.addEventListener('click', function(e) {
    fetch('/clicked', { method: 'POST' })
      .then(response => {
        if (response.ok) {
          const windowHeight = window.innerHeight;
          window.scrollTo({
            top: windowHeight,
            behavior: 'smooth'
          });
        }
      })
      .catch(error => {
        console.log(error);
      });
  });

  // Define the base URL with the desired port
  const BASE_URL = 'http://localhost:3000/';

  document.getElementById('aboutButton')?.addEventListener('click', function() {
    window.location.href = BASE_URL + 'About.html';
  });

  document.getElementById('contactButton')?.addEventListener('click', function() {
    window.location.href = BASE_URL + 'Contact.html';
  });

  document.getElementById('productsButton')?.addEventListener('click', function() {
    window.location.href = BASE_URL + 'MyIngredients.html';
  });

  document.getElementById('goBackButton')?.addEventListener('click', function() {
    window.location.href = BASE_URL;
  });

  document.getElementById('getRecipeButton')?.addEventListener('click', function() {
    const checkedIngredients = Array.from(selectedIngredients);

    if (checkedIngredients.length === 0) {
      document.getElementById('recipeOutput').innerHTML = '<p>No ingredients selected.</p>';
      return;
    }

    fetch('/getRecipe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ingredients: checkedIngredients.join(', ') }),
    })
    .then(response => response.json())
    .then(data => {
      displayRecipe(data.recipe);
      document.getElementById('recipeOutput').scrollIntoView({ behavior: 'smooth' });
    })
    .catch(error => {
      console.error('Error fetching recipe:', error);
    });
  });

  document.getElementById('clearButton')?.addEventListener('click', function() {
    document.getElementById('recipeOutput').innerHTML = '';

    const checkboxes = document.querySelectorAll('.ingredient-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });

    selectedIngredients.clear();
    localStorage.setItem('selectedIngredients', JSON.stringify([]));
  });

  function displayRecipe(recipeText) {
    const recipeOutput = document.getElementById('recipeOutput');
    
    // Clean up any unwanted introductory text
    let cleanedRecipeText = recipeText.replace(/^(Here are a few recipe ideas you can make with.*?\n\n|There are just a few ideas.*?\n\n|Here some idea.*?\n\n)/s, '');
    
    // Ensure that each recipe starts on a new line and is well-formatted
    const recipes = cleanedRecipeText.split('\n').filter(line => line.trim() !== '');

    // Add numbering to the first recipe only
    recipeOutput.innerHTML = recipes.map((recipe, index) => {
        const [title, ...instructions] = recipe.split(':');
        const instructionsText = instructions.join(':').trim();

        // Remove "Instructions:" from the beginning and end of the text
        const formattedInstructions = instructionsText.replace(/^(Instructions:|Instructions:\s*)|(\s*Instructions:)?$/g, '').trim();
        
        // Add numbering only to the first recipe
        const recipeNumber = index === 0 ? '1.' : '';

        return `
            <div class="recipe">
                <h3>${recipeNumber} ${title.trim()}</h3>
                <p><strong>Instructions:</strong></p>
                <p>${formattedInstructions}</p>
            </div>
        `;
    }).join('');
  }
});
