document.addEventListener('DOMContentLoaded', function() {
  const notificationBell = document.getElementById('notificationBell');
  const notificationSound = document.getElementById('notificationSound');
  const dropdownMenu = document.getElementById('notificationDropdown');
  let notificationSoundPlayed = false;
  
  localStorage.removeItem('selectedIngredients');
  let selectedIngredients = new Set(JSON.parse(localStorage.getItem('selectedIngredients')) || []);
  let expandedIngredients = new Set(JSON.parse(localStorage.getItem('expandedIngredients')) || []);
  
  setInterval(fetchIngredients, 1000);

  function fetchIngredients() {
    fetch('Ingredients.csv')
      .then(response => response.text())
      .then(text => {
        Papa.parse(text, {
          header: true,
          complete: function(results) {
            displayIngredients(results.data);
            checkForExpiringItems(results.data); // Call the expiration check function
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
    ingredientsList.innerHTML = '';
    const ingredientCountMap = {};

    data.forEach(item => {
      // Ensure 'best_before_date' field is captured and displayed
      if (ingredientCountMap[item.name]) {
        ingredientCountMap[item.name].count += 1;
        ingredientCountMap[item.name].dates.push(item.date);
        ingredientCountMap[item.name].bestBeforeDates.push(item.best_before_date);  // Store best-before dates
      } else {
        ingredientCountMap[item.name] = {
          count: 1,
          dates: [item.date],
          bestBeforeDates: [item.best_before_date]  // Initialize best-before dates
        };
      }
    });
    
    Object.keys(ingredientCountMap).forEach(name => {
      const ingredientData = ingredientCountMap[name];
      const count = ingredientData.count;
      const dates = ingredientData.dates;
      const bestBeforeDates = ingredientData.bestBeforeDates;  // Access best-before dates

      const itemDiv = document.createElement('div');
      itemDiv.classList.add('ingredient-item');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `ingredient-${name}`;
      checkbox.classList.add('ingredient-checkbox');
      checkbox.checked = selectedIngredients.has(name);

      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.textContent = `${name} (${count})`;

      const datesContainer = document.createElement('div');
      datesContainer.classList.add('dates-container');
      datesContainer.style.display = expandedIngredients.has(name) ? 'block' : 'none';

      // Display each date and its corresponding best-before date
      dates.forEach((date, index) => {
        const dateBox = document.createElement('div');
        dateBox.classList.add('date-box');
        dateBox.textContent = `Entry Date: ${date} | Best Before: ${bestBeforeDates[index]}`;  // Display both dates

        const dateRemoveButton = document.createElement('button');
        dateRemoveButton.classList.add('remove-button');
        dateRemoveButton.textContent = 'X';
        dateRemoveButton.classList.add('date-remove-button');
        dateRemoveButton.addEventListener('click', function(event) {
          removeIngredientDate(name, date);  // Remove specific date
        });
        dateBox.appendChild(dateRemoveButton);
        datesContainer.appendChild(dateBox);
      });

      const showDatesButton = document.createElement('button');
      showDatesButton.textContent = expandedIngredients.has(name) ? 'Hide' : 'Details';
      showDatesButton.classList.add('show-dates-button');
      showDatesButton.addEventListener('click', function(event) {
        event.stopPropagation();
        const isHidden = datesContainer.style.display === 'none';
        datesContainer.style.display = isHidden ? 'block' : 'none';
        showDatesButton.textContent = isHidden ? 'Hide' : 'Details';
        if (isHidden) {
          expandedIngredients.add(name);
        } else {
          expandedIngredients.delete(name);
        }
        localStorage.setItem('expandedIngredients', JSON.stringify(Array.from(expandedIngredients)));
      });

      datesContainer.addEventListener('click', function(event) {
        event.stopPropagation();
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
        editIngredient({ name: name });
      });

      itemDiv.appendChild(checkbox);
      itemDiv.appendChild(label);
      itemDiv.appendChild(showDatesButton);
      itemDiv.appendChild(datesContainer);
      itemDiv.appendChild(editButton);
      ingredientsList.appendChild(itemDiv);
    });
}

// Check if the elements exist before interacting with them
  if (notificationBell && notificationSound && dropdownMenu) {

    // Check for items that are near expiration or expired
    function checkForExpiringItems(data) {
      const today = new Date();
      const expiringItems = [];

      data.forEach(item => {
        const entryDate = new Date(item.date);
        const bestBeforeDate = new Date(item.best_before_date); // Assuming your CSV has a 'best_before_date' field

        const timeDiff = bestBeforeDate - today;
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)); // Convert time difference to days

        // If the item is expiring in 3 days or less or is expired
        if (daysDiff <= 3 && daysDiff >= 0) {
          expiringItems.push(`${item.name} (Expires in ${daysDiff} days)`);
        } else if (daysDiff < 0) {
          expiringItems.push(`${item.name} (Expired ${Math.abs(daysDiff)} days ago)`);
        }
      });

      if (expiringItems.length > 0) {
        // Show exclamation mark, play sound, and populate dropdown
        notificationBell.classList.add('has-notifications');
        // Play notification sound only once
		if (!notificationSoundPlayed) {
        notificationSound.play();
        notificationSoundPlayed = true;  // Set to true after playing the sound
		}
        showDropdown(expiringItems);
      } else {
        // Hide exclamation mark if no notifications
        notificationBell.classList.remove('has-notifications');
        dropdownMenu.innerHTML = ''; // Clear dropdown
      }
    }

    // Show the dropdown with expiring items
    function showDropdown(items) {
      dropdownMenu.innerHTML = items.map(item => `<li>${item}</li>`).join('');
    }

    // Toggle dropdown visibility when the bell is clicked
    notificationBell.addEventListener('click', function() {
      dropdownMenu.classList.toggle('show');
    });

  } else {
    console.error('Notification elements not found in the DOM.');
  }

  function removeIngredientDate(ingredientName, date) {
    fetch('/removeIngredientDate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredient: ingredientName, date: date }),
    })
    .then(response => response.ok ? fetchIngredients() : console.error('Failed to remove ingredient'))
    .catch(error => console.error('Error removing ingredient:', error));
  }

  document.getElementById('getRecipeButton')?.addEventListener('click', function() {
    const checkedIngredients = Array.from(selectedIngredients);

    if (checkedIngredients.length === 0) {
      document.getElementById('recipeOutput').innerHTML = '<p>No ingredients selected.</p>';
      return;
    }

    fetch('/getRecipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients: checkedIngredients.join(', ') }),
    })
    .then(response => response.json())
    .then(data => {
      displayRecipes(data.recipes);
      document.getElementById('recipeOutput').scrollIntoView({ behavior: 'smooth' });
    })
    .catch(error => console.error('Error fetching recipe:', error));
  });

  document.getElementById('clearButton')?.addEventListener('click', function() {
    document.getElementById('recipeOutput').innerHTML = '';
    const checkboxes = document.querySelectorAll('.ingredient-checkbox');
    checkboxes.forEach(checkbox => checkbox.checked = false);
    selectedIngredients.clear();
    localStorage.setItem('selectedIngredients', JSON.stringify([]));
  });

  function displayRecipes(recipes) {
    const recipeOutput = document.getElementById('recipeOutput');
    recipeOutput.innerHTML = recipes.map((recipe, index) => `
      <div class="recipe">
        <h3>${index + 1}. ${recipe.title}</h3>
        <p><strong>Ingredients:</strong> ${recipe.ingredients}</p>
        <p><strong>Instructions:</strong> ${recipe.instructions}</p>
        <p><strong>Extra Ingredients Needed:</strong> ${recipe.extraIngredients.join(', ') || 'None'}</p>
      </div>
    `).join('');
  }

  // Functionality for the Add Items button
  document.getElementById('addButton')?.addEventListener('click', function() {
    const ingredientName = prompt('Enter the ingredient name:');
    const ingredientDate = prompt('Enter the entry date (Month-DD-YY):');

    if (ingredientName && ingredientDate) {
      fetch('/addIngredient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: ingredientName, date: ingredientDate }),
      })
      .then(response => {
        if (response.ok) {
          alert('Ingredient added successfully.');
          fetchIngredients(); // Refresh ingredients list
        } else {
          alert('Failed to add ingredient.');
        }
      })
      .catch(error => console.error('Error adding ingredient:', error));
    }
  });

  // Additional event listeners for navigation buttons
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
});
