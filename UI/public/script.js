document.addEventListener('DOMContentLoaded', function() {
  setInterval(fetchIngredients, 1000);

  let selectedIngredients = new Set(JSON.parse(localStorage.getItem('selectedIngredients')) || []);

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
    data.forEach(item => {
      const itemDiv = document.createElement('div');
      itemDiv.classList.add('ingredient-item');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `ingredient-${item.name}`;
      checkbox.classList.add('ingredient-checkbox');
      checkbox.checked = selectedIngredients.has(item.name);

      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.textContent = `${item.name} (${item.quantity || 'N/A'})`;

      checkbox.addEventListener('change', function() {
        if (checkbox.checked) {
          selectedIngredients.add(item.name);
        } else {
          selectedIngredients.delete(item.name);
        }
        localStorage.setItem('selectedIngredients', JSON.stringify(Array.from(selectedIngredients)));
      });

      const removeButton = document.createElement('button');
      removeButton.textContent = 'X';
      removeButton.classList.add('remove-button');
      removeButton.addEventListener('click', function() {
        removeIngredient(item.name);
      });

      const editButton = document.createElement('button');
      editButton.textContent = 'Edit';
      editButton.classList.add('edit-button');
      editButton.addEventListener('click', function() {
        editIngredient(item);
      });

      itemDiv.appendChild(checkbox);
      itemDiv.appendChild(label);
      itemDiv.appendChild(editButton);
      itemDiv.appendChild(removeButton);
      ingredientsList.appendChild(itemDiv);
    });
  }

  function removeIngredient(ingredientName) {
    fetch('/removeIngredient', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: ingredientName }),
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

  function editIngredient(ingredient) {
    const newName = prompt(`Edit name for ${ingredient.name}:`, ingredient.name);
    const newQuantity = prompt(`Edit quantity for ${ingredient.name}:`, ingredient.quantity || 'N/A');

    if (newName && newQuantity !== null) {
      fetch('/editIngredient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ oldName: ingredient.name, newName, newQuantity }),
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

  document.getElementById('aboutButton')?.addEventListener('click', function() {
    window.location.href = 'http://localhost:8080/About.html';
  });

  document.getElementById('contactButton')?.addEventListener('click', function() {
    window.location.href = 'http://localhost:8080/Contact.html';
  });

  document.getElementById('productsButton')?.addEventListener('click', function() {
    window.location.href = 'http://localhost:8080/MyIngredients.html';
  });

  document.getElementById('goBackButton')?.addEventListener('click', function() {
    window.location.href = 'http://localhost:8080/';
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
    const recipes = recipeText.split('\n').filter(line => line.trim() !== '');

    recipeOutput.innerHTML = recipes.map(recipe => {
      const [title, ...instructions] = recipe.split(':');
      const instructionsText = instructions.join(':').trim();

      return `
        <div class="recipe">
          <h3>${title.trim()}</h3>
          <p><strong>Instructions:</strong></p>
          <p>${instructionsText}</p>
        </div>
      `;
    }).join('');
  }
});
