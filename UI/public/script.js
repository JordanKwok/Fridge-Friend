document.addEventListener('DOMContentLoaded', function() {
  const notificationBell = document.getElementById('notificationBell');
  const notificationSound = document.getElementById('notificationSound');
  const dropdownMenu = document.getElementById('notificationDropdown');
  const shoppingListButton = document.getElementById('shoppingListButton');
  const shoppingListDropdown = document.getElementById('shoppingListDropdown');

  let notificationSoundPlayed = false;

  localStorage.removeItem('selectedIngredients');
  let selectedIngredients = new Set(JSON.parse(localStorage.getItem('selectedIngredients')) || []);
  let expandedIngredients = new Set(JSON.parse(localStorage.getItem('expandedIngredients')) || []);

  setInterval(fetchIngredients, 1000);

	function calculateBestBeforeDate(entryDate, shelfLife) {
	  const date = new Date(entryDate);
	  date.setDate(date.getDate() + shelfLife);
	  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "2-digit" }).replace(' ', '-');
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
	  "cereal": { category: "Packaged Goods", shelfLife: 30 }
	  // Add more items as needed
	};



  function fetchIngredients() {
	  fetch('Ingredients.csv')
		.then(response => response.text())
		.then(text => {
		  Papa.parse(text, {
			header: true,
			complete: function(results) {
			  // Automatically update the best_before_date if undefined
			  results.data.forEach(item => {
				if (!item.best_before_date || item.best_before_date.trim() === "") {
				  const category = categoryMap[item.name.toLowerCase()];
				  if (category) {
					item.best_before_date = calculateBestBeforeDate(item.date, category.shelfLife);
				  }
				}
			  });

			  displayIngredients(results.data);
			  checkForExpiringItems(results.data);
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
        ingredientCountMap[item.name].bestBeforeDates.push(item.best_before_date);
      } else {
        ingredientCountMap[item.name] = {
          count: 1,
          dates: [item.date],
          bestBeforeDates: [item.best_before_date]
        };
      }
    });

    Object.keys(ingredientCountMap).forEach(name => {
      const ingredientData = ingredientCountMap[name];
      const count = ingredientData.count;
      const dates = ingredientData.dates;
      const bestBeforeDates = ingredientData.bestBeforeDates;

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

      dates.forEach((date, index) => {
        const dateBox = document.createElement('div');
        dateBox.classList.add('date-box');
        dateBox.textContent = `Entry Date: ${date} | Best Before: ${bestBeforeDates[index]}`;

        const dateRemoveButton = document.createElement('button');
        dateRemoveButton.classList.add('remove-button');
        dateRemoveButton.textContent = 'X';
        dateRemoveButton.addEventListener('click', function() {
          removeIngredientDate(name, date);
        });
        dateBox.appendChild(dateRemoveButton);
        datesContainer.appendChild(dateBox);
      });

      const showDatesButton = document.createElement('button');
      showDatesButton.textContent = expandedIngredients.has(name) ? 'Hide' : 'Details';
      showDatesButton.classList.add('show-dates-button');
      showDatesButton.addEventListener('click', function() {
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
        editIngredient({ name });
      });

      itemDiv.appendChild(checkbox);
      itemDiv.appendChild(label);
      itemDiv.appendChild(showDatesButton);
      itemDiv.appendChild(datesContainer);
      itemDiv.appendChild(editButton);
      ingredientsList.appendChild(itemDiv);
    });
  }

  if (notificationBell && notificationSound && dropdownMenu) {
    function checkForExpiringItems(data) {
      const today = new Date();
      const expiringItems = [];

      data.forEach(item => {
        const bestBeforeDate = new Date(item.best_before_date);
        const daysDiff = Math.ceil((bestBeforeDate - today) / (1000 * 3600 * 24));

        if (daysDiff <= 3 && daysDiff >= 0) {
          expiringItems.push(`${item.name} (Expires in ${daysDiff} days)`);
        } else if (daysDiff < 0) {
          expiringItems.push(`${item.name} (Expired ${Math.abs(daysDiff)} days ago)`);
        }
      });

      if (expiringItems.length > 0) {
        notificationBell.classList.add('has-notifications');
        if (!notificationSoundPlayed) {
          notificationSound.play();
          notificationSoundPlayed = true;
        }
        showDropdown(expiringItems);
      } else {
        notificationBell.classList.remove('has-notifications');
        dropdownMenu.innerHTML = '';
      }
    }

    function showDropdown(items) {
      dropdownMenu.innerHTML = items.map(item => `<li>${item}</li>`).join('');
    }

    notificationBell.addEventListener('click', function() {
		// Toggle the 'show' class for the notification dropdown
		notificationDropdown.classList.toggle('show');

		// If the notifications dropdown is shown, hide the shopping list dropdown
		if (notificationDropdown.classList.contains('show')) {
		  shoppingListDropdown.classList.remove('show');
		}
	  });
  } else {
    console.error('Notification elements not found in the DOM.');
  }

	// Function to remove an ingredient date
	function removeIngredientDate(name, date) {
	  fetch('/removeIngredientDate', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ ingredient: name, date: date })
	  })
	  .then(response => {
		if (response.ok) {
		  alert('Ingredient removed successfully.');
		  fetchIngredients(); // Refresh the ingredients list
		} else {
		  alert('Failed to remove ingredient.');
		}
	  })
	  .catch(error => console.error('Error removing ingredient:', error));
	}

	// Function to edit an ingredient
	function editIngredient({ name }) {
	  const newName = prompt(`Edit name for ${name}:`, name);
	  const newDate = prompt('Edit entry date (Month-DD-YY):');

	  if (newName && newDate) {
		fetch('/editIngredient', {
		  method: 'POST',
		  headers: { 'Content-Type': 'application/json' },
		  body: JSON.stringify({ oldName: name, newName: newName, newDate: newDate })
		})
		.then(response => {
		  if (response.ok) {
			alert('Ingredient updated successfully.');
			fetchIngredients(); // Refresh the ingredients list
		  } else {
			alert('Failed to update ingredient.');
		  }
		})
		.catch(error => console.error('Error editing ingredient:', error));
	  }
	}

	// Helper function to create the status display string
	function statusDisplay(statusCounts) {
	  const statuses = [];
	  if (statusCounts.lowStock > 0) statuses.push(`Low Stock x${statusCounts.lowStock}`);
	  if (statusCounts.expiringSoon > 0) statuses.push(`Expiring Soon x${statusCounts.expiringSoon}`);
	  if (statusCounts.expired > 0) statuses.push(`Expired x${statusCounts.expired}`);
	  return `(${statuses.join(" / ")})`;
	}

	// Helper function to capitalize the first letter of an item name
	function capitalize(name) {
	  return name.charAt(0).toUpperCase() + name.slice(1);
	}


	// Shopping List Logic
	if (shoppingListButton && shoppingListDropdown) {
	  shoppingListButton.addEventListener('click', function() {
		// Toggle the 'show' class to show or hide the shopping list
		shoppingListDropdown.classList.toggle('show');

		// If the shopping list is shown, hide the notifications dropdown
		if (shoppingListDropdown.classList.contains('show')) {
		  notificationDropdown.classList.remove('show');
		}

		// Generate the shopping list only when the dropdown is shown
		if (shoppingListDropdown.classList.contains('show')) {
		  generateShoppingList();
		}
	  });

    // Function to generate the shopping list
	function generateShoppingList() {
	  shoppingListDropdown.innerHTML = ''; // Clear any previous items
	  const today = new Date();
	  const itemsToRestock = {}; // Use an object to store item names and status counts

	  // Fetch and parse the CSV file to populate the shopping list
	  fetch('Ingredients.csv')
		.then(response => response.text())
		.then(text => {
		  Papa.parse(text, {
			header: true,
			complete: function(results) {
			  console.log('Parsed CSV data:', results.data);

			  // Iterate through the parsed CSV data
			  results.data.forEach(item => {
				if (!item.name || !item.date) {
				  console.warn('Skipping invalid item:', item);
				  return; // Skip invalid items
				}

				// Convert the item name to lowercase for consistency
				const lowerCaseItemName = item.name.trim().toLowerCase();

				const entryDate = new Date(item.date.trim());

				// Check if the lowercase item exists in the category map
				if (categoryMap[lowerCaseItemName]) {
				  const shelfLife = categoryMap[lowerCaseItemName].shelfLife;
				  const bestBeforeDate = new Date(entryDate);
				  bestBeforeDate.setDate(bestBeforeDate.getDate() + shelfLife);

				  const daysUntilExpiry = Math.ceil((bestBeforeDate - today) / (1000 * 3600 * 24));

				  // Initialize the item in itemsToRestock if it doesn't exist
				  if (!itemsToRestock[lowerCaseItemName]) {
					itemsToRestock[lowerCaseItemName] = { lowStock: 0, expiringSoon: 0, expired: 0 };
				  }

				  // Check stock and expiration conditions
				  if (daysUntilExpiry < 0) {
					itemsToRestock[lowerCaseItemName].expired += 1;
				  } else if (daysUntilExpiry <= 3) {
					itemsToRestock[lowerCaseItemName].expiringSoon += 1;
				  } else if (lowerCaseItemName === "milk" && daysUntilExpiry <= 7) {
					// Special case for milk: low stock if <= 1
					if (itemsToRestock[lowerCaseItemName].lowStock < 1) {
					  itemsToRestock[lowerCaseItemName].lowStock += 1;
					}
				  } else {
					itemsToRestock[lowerCaseItemName].lowStock += 1;
				  }
				} else {
				  console.warn(`Item '${lowerCaseItemName}' not found in categoryMap.`);
				}
			  });

			  // Display the items in the shopping list
			  const entries = Object.entries(itemsToRestock);
			  if (entries.length > 0) {
				entries.forEach(([itemName, statusCounts]) => {
				  let listItem = document.createElement('li');
				  listItem.textContent = `${capitalize(itemName)} ${statusDisplay(statusCounts)}`;
				  shoppingListDropdown.appendChild(listItem);
				});
			  } else {
				shoppingListDropdown.innerHTML = '<li>No items need restocking.</li>';
			  }
			},
			error: function(error) {
			  console.error('Error parsing CSV:', error);
			}
		  });
		})
		.catch(error => console.error('Error fetching CSV:', error));
	}
  } else {
    console.error('Shopping list elements not found in the DOM.');
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
  // Prompt for the ingredient name and entry date
  let ingredientName = prompt('Enter the ingredient name:').toLowerCase().trim();
  const entryDate = prompt('Enter the entry date (Month-DD-YY):');

  // Capitalize the first letter of the ingredient name
  ingredientName = ingredientName.charAt(0).toUpperCase() + ingredientName.slice(1);

  if (ingredientName && entryDate) {
    // Make a request to add the ingredient
    fetch('/addIngredient', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: ingredientName,
        date: entryDate
      })
    })
    .then(response => {
      if (response.ok) {
        alert('Ingredient added successfully.');
        fetchIngredients(); // Refresh the ingredients list
      } else {
        alert('Failed to add ingredient.');
      }
    })
    .catch(error => console.error('Error adding ingredient:', error));
  } else {
    alert("Invalid input. Please try again.");
  }
});

// Function to format the date as "MMM-DD-YY"
function formatDate(date) {
  const dateObj = new Date(date);
  const month = dateObj.toLocaleString('en-US', { month: 'short' }); // Get the abbreviated month
  const day = String(dateObj.getDate()).padStart(2, '0'); // Ensure two-digit day
  const year = String(dateObj.getFullYear()).slice(-2); // Get the last two digits of the year

  return `${month}-${day}-${year}`; // Construct the formatted date string
}
  
  const BASE_URL = 'http://localhost:3000/';

  document.getElementById('aboutButton')?.addEventListener('click', function() {
    window.location.href = `${BASE_URL}About.html`;
  });

  document.getElementById('contactButton')?.addEventListener('click', function() {
    window.location.href = `${BASE_URL}Contact.html`;
  });

  document.getElementById('productsButton')?.addEventListener('click', function() {
    window.location.href = `${BASE_URL}MyIngredients.html`;
  });

  document.getElementById('goBackButton')?.addEventListener('click', function() {
    window.location.href = BASE_URL;
  });

  document.getElementById('learnMoreButton')?.addEventListener('click', function() {
    const windowHeight = window.innerHeight;
    window.scrollTo({ top: windowHeight, behavior: 'smooth' });
  });
});
