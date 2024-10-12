document.addEventListener('DOMContentLoaded', function() {
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
      if (ingredientCountMap[item.name]) {
        ingredientCountMap[item.name].count += 1;
        ingredientCountMap[item.name].dates.push(item.date);
      } else {
        ingredientCountMap[item.name] = {
          count: 1,
          dates: [item.date]
        };
      }
    });

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
      label.textContent = `${name} (${count})`;

      const datesContainer = document.createElement('div');
      datesContainer.classList.add('dates-container');
      datesContainer.style.display = expandedIngredients.has(name) ? 'block' : 'none';

      dates.forEach((date) => {
        const dateBox = document.createElement('div');
        dateBox.classList.add('date-box');
        dateBox.textContent = `${date}`;

        const dateRemoveButton = document.createElement('button');
        dateRemoveButton.textContent = 'X';
        dateRemoveButton.classList.add('date-remove-button');
        dateRemoveButton.addEventListener('click', function(event) {
          event.stopPropagation();
          removeIngredientDate(name, date);
        });
        dateBox.appendChild(dateRemoveButton);
        datesContainer.appendChild(dateBox);
      });

      const showDatesButton = document.createElement('button');
      showDatesButton.textContent = expandedIngredients.has(name) ? 'Hide Dates' : 'Show Dates';
      showDatesButton.classList.add('show-dates-button');
      showDatesButton.addEventListener('click', function(event) {
        event.stopPropagation();
        const isHidden = datesContainer.style.display === 'none';
        datesContainer.style.display = isHidden ? 'block' : 'none';
        showDatesButton.textContent = isHidden ? 'Hide Dates' : 'Show Dates';
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
