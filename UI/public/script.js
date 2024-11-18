document.addEventListener('DOMContentLoaded', function() {
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

  // Global elements and functions
  const socket = io();
  const BASE_URL = 'http://localhost:3000/';

  // Navigation buttons
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

  // Global notification logic for session completion
  socket.on('sessionComplete', function(newItems) {
    alert('A session has completed. Click to review items.');

    if (confirm('Do you want to view your items now?')) {
      localStorage.setItem('showSessionModal', 'true');
      localStorage.setItem('newItemsData', JSON.stringify(newItems));
      window.location.href = `${BASE_URL}MyIngredients.html`;
    }
  });

  // Check if on MyIngredients.html page
  if (document.body.classList.contains('my-ingredients-page')) {
    const notificationBell = document.getElementById('notificationBell');
	  const notificationSound = document.getElementById('notificationSound');
	  const dropdownMenu = document.getElementById('notificationDropdown');
	  const shoppingListButton = document.getElementById('shoppingListButton');
	  const shoppingListDropdown = document.getElementById('shoppingListDropdown');
	  const sessionModal = document.getElementById('sessionModal');
	  const sessionItemsContainer = document.getElementById('sessionItems');
	  const exitSessionReviewButton = document.getElementById('exitSessionReviewButton');

	  let notificationSoundPlayed = false;
	  let selectedIngredients = new Set(JSON.parse(localStorage.getItem('selectedIngredients')) || []);
	  let expandedIngredients = new Set(JSON.parse(localStorage.getItem('expandedIngredients')) || []);

	  let itemsConfirmedCount = 0;
	  let totalItems = 0;
	  const itemsToInsert = [];

	  // Check if the exitSessionReviewButton exists before setting properties
	  if (exitSessionReviewButton) {
		exitSessionReviewButton.disabled = true;
	  }

    setInterval(fetchIngredients, 1000);

    function fetchIngredients() {
      fetch('Ingredients.csv')
        .then(response => response.text())
        .then(text => {
          Papa.parse(text, {
            header: true,
            complete: function(results) {
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
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('ingredient-item');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `ingredient-${name}`;
        checkbox.classList.add('ingredient-checkbox');
        checkbox.checked = selectedIngredients.has(name);
        checkbox.addEventListener('change', function() {
          if (checkbox.checked) {
            selectedIngredients.add(name);
          } else {
            selectedIngredients.delete(name);
          }
          localStorage.setItem('selectedIngredients', JSON.stringify(Array.from(selectedIngredients)));
        });

        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = `${name} (${ingredientData.count})`;

        const datesContainer = document.createElement('div');
        datesContainer.classList.add('dates-container');
        datesContainer.style.display = expandedIngredients.has(name) ? 'block' : 'none';

        ingredientData.dates.forEach((date, index) => {
          const dateBox = document.createElement('div');
          dateBox.classList.add('date-box');
          dateBox.textContent = `Entry Date: ${date} | Best Before: ${ingredientData.bestBeforeDates[index]}`;
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

        itemDiv.appendChild(checkbox);
        itemDiv.appendChild(label);
        itemDiv.appendChild(showDatesButton);
        itemDiv.appendChild(datesContainer);
        ingredientsList.appendChild(itemDiv);
      });
    }

    const showSessionModal = localStorage.getItem('showSessionModal');
    if (showSessionModal === 'true') {
      localStorage.removeItem('showSessionModal');
      const newItemsData = JSON.parse(localStorage.getItem('newItemsData') || '{}');
      showSessionReviewModal(newItemsData);
    }

	// Function to show the session review modal
	function showSessionReviewModal(newItems) {
	  sessionItemsContainer.innerHTML = ''; // Clear previous items
	  const itemCounts = {};

	  // Count the quantities for each item
	  Object.entries(newItems).forEach(([itemName, status]) => {
		if (status === true) {
		  if (itemCounts[itemName]) {
			itemCounts[itemName] += 1;
		  } else {
			itemCounts[itemName] = 1;
		  }
		}
	  });

	  totalItems = Object.keys(itemCounts).length; // Set totalItems count

	  // Populate the modal with items
	  Object.entries(itemCounts).forEach(([itemName, count]) => {
		const itemRow = document.createElement('div');
		itemRow.classList.add('item-row');

		// Create a non-editable text span for the item name
		const nameSpan = document.createElement('span');
		nameSpan.textContent = itemName;
		nameSpan.classList.add('item-name-span');

		// Create an editable text input (hidden by default)
		const nameInput = document.createElement('input');
		nameInput.type = 'text';
		nameInput.value = itemName;
		nameInput.classList.add('item-name-input');
		nameInput.style.display = 'none'; // Hide initially

		// Create the Edit button
		const editButton = document.createElement('button');
		editButton.textContent = 'Edit';
		editButton.classList.add('edit-button');
		editButton.addEventListener('click', () => {
		  nameSpan.style.display = 'none'; // Hide the span
		  nameInput.style.display = 'inline'; // Show the input
		  nameInput.disabled = false; // Make the input editable
		  editButton.style.display = 'none'; // Hide the Edit button
		});

		// Create the Confirm button
		const confirmButton = document.createElement('button');
		confirmButton.textContent = 'Confirm';
		confirmButton.classList.add('confirm-button');
		confirmButton.addEventListener('click', () => {
		  nameInput.disabled = true; // Make the input non-editable
		  nameInput.style.display = 'none'; // Hide the input
		  nameSpan.textContent = nameInput.value.trim(); // Update the span text
		  nameSpan.style.display = 'inline'; // Show the span
		  nameSpan.classList.add('centered'); // Center the text
		  confirmButton.style.display = 'none'; // Hide the Confirm button
		  editButton.style.display = 'none'; // Hide the Edit button

		  // Add item to itemsToInsert array for server submission with formatted date
		  itemsToInsert.push({
			name: nameInput.value.trim(),
			date: formatDate(new Date()) // Use formatDate function for correct date format
		  });

		  itemsConfirmedCount++;
		  if (itemsConfirmedCount === totalItems) {
			exitSessionReviewButton.disabled = false; // Enable Close button
		  }
		});

		// Append elements to the item row
		itemRow.appendChild(nameSpan);
		itemRow.appendChild(nameInput);
		itemRow.appendChild(editButton);
		itemRow.appendChild(confirmButton);
		sessionItemsContainer.appendChild(itemRow);
	  });

	  // Show the modal
	  sessionModal.classList.add('show');

	  // Close button logic in the modal
	  exitSessionReviewButton.addEventListener('click', function () {
		sessionModal.classList.remove('show'); // Close the modal

		// Send the confirmed items to the server
		fetch('/addConfirmedItems', {
		  method: 'POST',
		  headers: { 'Content-Type': 'application/json' },
		  body: JSON.stringify(itemsToInsert), // Send only confirmed items
		})
		  .then(response => {
			if (response.ok) {
			  alert('Items have been added successfully.');
			  fetchIngredients(); // Refresh the ingredients list
			} else {
			  alert('Failed to add items.');
			}
		  })
		  .catch(error => console.error('Error adding items:', error));
	  });
	}

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
      notificationDropdown.classList.toggle('show');
      if (notificationDropdown.classList.contains('show')) {
        shoppingListDropdown.classList.remove('show');
      }
    });

    shoppingListButton?.addEventListener('click', function() {
      shoppingListDropdown.classList.toggle('show');
      if (shoppingListDropdown.classList.contains('show')) {
        notificationDropdown.classList.remove('show');
        generateShoppingList();
      }
    });

    function generateShoppingList() {
      shoppingListDropdown.innerHTML = '';
      const today = new Date();
      const itemsToRestock = {};

      fetch('Ingredients.csv')
        .then(response => response.text())
        .then(text => {
          Papa.parse(text, {
            header: true,
            complete: function(results) {
              results.data.forEach(item => {
                if (!item.name || !item.date) return;
                const lowerCaseItemName = item.name.trim().toLowerCase();
                const entryDate = new Date(item.date.trim());
                if (categoryMap[lowerCaseItemName]) {
                  const shelfLife = categoryMap[lowerCaseItemName].shelfLife;
                  const bestBeforeDate = new Date(entryDate);
                  bestBeforeDate.setDate(bestBeforeDate.getDate() + shelfLife);
                  const daysUntilExpiry = Math.ceil((bestBeforeDate - today) / (1000 * 3600 * 24));

                  if (!itemsToRestock[lowerCaseItemName]) {
                    itemsToRestock[lowerCaseItemName] = { lowStock: 0, expiringSoon: 0, expired: 0 };
                  }

                  if (daysUntilExpiry < 0) {
                    itemsToRestock[lowerCaseItemName].expired += 1;
                  } else if (daysUntilExpiry <= 3) {
                    itemsToRestock[lowerCaseItemName].expiringSoon += 1;
                  } else if (lowerCaseItemName === "milk" && daysUntilExpiry <= 7) {
                    if (itemsToRestock[lowerCaseItemName].lowStock < 1) {
                      itemsToRestock[lowerCaseItemName].lowStock += 1;
                    }
                  } else {
                    itemsToRestock[lowerCaseItemName].lowStock += 1;
                  }
                }
              });

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
    checkboxes.forEach(checkbox => (checkbox.checked = false));
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

  document.getElementById('addButton')?.addEventListener('click', function() {
    let ingredientName = prompt('Enter the ingredient name:').toLowerCase().trim();
    const entryDate = prompt('Enter the entry date (Month-DD-YY):');
    ingredientName = ingredientName.charAt(0).toUpperCase() + ingredientName.slice(1);

    if (ingredientName && entryDate) {
      fetch('/addIngredient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: ingredientName, date: entryDate }),
      })
        .then(response => {
          if (response.ok) {
            alert('Ingredient added successfully.');
            fetchIngredients();
          } else {
            alert('Failed to add ingredient.');
          }
        })
        .catch(error => console.error('Error adding ingredient:', error));
    } else {
      alert('Invalid input. Please try again.');
    }
  });

  function formatDate(date) {
    const dateObj = new Date(date);
    const month = dateObj.toLocaleString('en-US', { month: 'short' });
    const day = String(dateObj.getDate()).padStart(2, '0');
    const year = String(dateObj.getFullYear()).slice(-2);
    return `${month}-${day}-${year}`;
  }

  function calculateBestBeforeDate(entryDate, shelfLife) {
    const date = new Date(entryDate);
    date.setDate(date.getDate() + shelfLife);
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: '2-digit' }).replace(' ', '-');
  }

  function removeIngredientDate(name, date) {
    fetch('/removeIngredientDate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredient: name, date: date }),
    })
      .then(response => {
        if (response.ok) {
          alert('Ingredient removed successfully.');
          fetchIngredients();
        } else {
          alert('Failed to remove ingredient.');
        }
      })
      .catch(error => console.error('Error removing ingredient:', error));
  }
});
