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
    "Dark Chocolate Hazelnut Bar": { category: "Packaged Goods", shelfLife: 30 },
    "cereal": { category: "Packaged Goods", shelfLife: 30 }
  };

  // Assuming user ID is available in some form, e.g., from localStorage
  const userId = 'fridgefriend09';
  const BASE_URL = 'http://localhost:3000/';

  // Global elements and functions
  // const socket = io();
  // Connect to the socket with userId as a query parameter
  const socket = io(BASE_URL, { query: { userId } });
  

  // Add a new session to the queue if user cancels the initial review
  socket.on('sessionComplete', function({ session_start, newItems }) {
    if (!newItems || newItems.length === 0) {
      console.log("No items to review, skipping session review modal.");
      return; // Do not trigger the modal if newItems is empty
    }

    if (confirm('A session has completed. Do you want to view your items now?')) {
      localStorage.setItem('showSessionModal', 'true');
      localStorage.setItem('newItemsData', JSON.stringify({ session_start, newItems }));
      window.location.href = `${BASE_URL}MyIngredients.html`;
    } else {
      console.log("User chose to review later.");
      pendingSessions.push({ session_start, newItems });
      localStorage.setItem('pendingSessions', JSON.stringify(pendingSessions));
      updateSessionButton(pendingSessions.length);
    }
  });

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

  async function fetchProductNameFromBarcode(barcode) {
    try {
      const response = await fetch(`${BASE_URL}getProductNameFromBarcode/${barcode}`);
      if (response.ok) {
        const data = await response.json();
        return data.name;
      }
    } catch (error) {
      console.error('Error fetching product name:', error);
    }
    return `Unknown Product (${barcode})`;
  }

    const notificationBell = document.getElementById('notificationBell');
	  const notificationSound = document.getElementById('notificationSound');
	  const dropdownMenu = document.getElementById('notificationDropdown');
	  const shoppingListButton = document.getElementById('shoppingListButton');
	  const shoppingListDropdown = document.getElementById('shoppingListDropdown');
	  const sessionModal = document.getElementById('sessionModal');
	  const sessionItemsContainer = document.getElementById('sessionItems');
	  const exitSessionReviewButton = document.getElementById('exitSessionReviewButton');
    const sessionButton = document.getElementById('sessionButton');
    const sessionCounter = document.getElementById('sessionCounter');
    const sessionQueueModal = document.getElementById('sessionQueueModal');
    const sessionQueueList = document.getElementById('sessionQueueList');
    const closeSessionQueueModal = document.getElementById('closeSessionQueueModal');

	  let notificationSoundPlayed = false;
    localStorage.removeItem('selectedIngredients');
	  let selectedIngredients = new Set(JSON.parse(localStorage.getItem('selectedIngredients')) || []);
	  let expandedIngredients = new Set(JSON.parse(localStorage.getItem('expandedIngredients')) || []);

	  let itemsConfirmedCount = 0;
	  let totalItems = 0;
    
    // Load pending sessions from localStorage
    let pendingSessions = JSON.parse(localStorage.getItem('pendingSessions') || '[]');
  updateSessionButton(pendingSessions.length);

  function updateSessionButton(count) {
    if (count > 0) {
      sessionCounter.textContent = count;
      sessionCounter.classList.remove('hidden');
    } else {
      sessionCounter.classList.add('hidden');
    }
  }

    // Show the session queue modal
    function showSessionQueueModal() {
      if (pendingSessions.length === 0) {
        alert('No pending sessions for review.');
        return; // Do not open modal if there are no sessions to review
      }
  
      sessionQueueList.innerHTML = '';
  
      pendingSessions.forEach((session, index) => {
        const sessionEntry = document.createElement('div');
        sessionEntry.classList.add('session-entry');
        sessionEntry.innerHTML = `
          <span>Session Start: ${session.session_start}</span>
          <button data-index="${index}" class="view-session-button">View</button>
        `;
        sessionQueueList.appendChild(sessionEntry);
      });
  
      // Attach event listeners to each "View" button
      document.querySelectorAll('.view-session-button').forEach(button => {
        button.addEventListener('click', function() {
          const index = this.getAttribute('data-index');
          const session = pendingSessions[index];
          if (session) {
            localStorage.setItem('showSessionModal', 'true');
            localStorage.setItem('newItemsData', JSON.stringify(session));
            pendingSessions.splice(index, 1);
            localStorage.setItem('pendingSessions', JSON.stringify(pendingSessions));
            updateSessionButton(pendingSessions.length);
            sessionQueueModal.classList.remove('show');
            window.location.href = `${BASE_URL}MyIngredients.html`;
          }
        });
      });
  
      sessionQueueModal.classList.add('show');
    }
  
    // Attach event listener to session button
    sessionButton.addEventListener('click', function() {
      if (pendingSessions.length > 0) {
        showSessionQueueModal();
      } else {
        alert('No pending sessions for review.');
      }
    });
  
    // Close the session queue modal
    closeSessionQueueModal.addEventListener('click', function() {
      sessionQueueModal.classList.remove('show');
    });
  
    // Attach close event on clicking outside the modal
    window.addEventListener('click', function(event) {
      if (event.target === sessionQueueModal) {
        sessionQueueModal.classList.remove('show');
      }
    });

	  // Check if the exitSessionReviewButton exists before setting properties
	  if (exitSessionReviewButton) {
		exitSessionReviewButton.disabled = false;
	  }

    setInterval(fetchIngredients, 1000);

    function fetchIngredients() {
      fetch('Ingredients.csv')
        .then(response => response.text())
        .then(text => {
          Papa.parse(text, {
            header: true,
            complete: function(results) {
              // Filter valid data entries
              const validData = results.data.filter(item => item.name && item.date);
    
              validData.forEach(item => {
                // Remove leading tabs
                item.name = item.name.replace(/^\t+/, '').trim();
                item.date = item.date.replace(/^\t+/, '').trim();
    
                // Calculate the best before date
                let category = categoryMap[item.name.toLowerCase()];
    
                // If no category is found, set a default shelfLife of 14 days
                const shelfLife = category ? category.shelfLife : 14;
    
                if (!item.best_before_date || item.best_before_date.trim() === "") {
                  const parsedDate = new Date(item.date);
                  if (!isNaN(parsedDate)) {
                    item.best_before_date = calculateBestBeforeDate(parsedDate, shelfLife);
                  } else {
                    console.warn(`Invalid date encountered for item: ${item.name}, date: ${item.date}`);
                  }
                }
              });
    
              displayIngredients(validData);
              checkForExpiringItems(validData);
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
        const itemName = item.name.trim().toLowerCase();
        if (!itemName) return; // Skip invalid items
    
        if (ingredientCountMap[itemName]) {
          ingredientCountMap[itemName].count += 1;
          ingredientCountMap[itemName].dates.push(item.date);
          ingredientCountMap[itemName].bestBeforeDates.push(item.best_before_date);
        } else {
          ingredientCountMap[itemName] = {
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
        label.textContent = `${capitalize(name)} (${ingredientData.count})`;
    
        const datesContainer = document.createElement('div');
        datesContainer.classList.add('dates-container');
        datesContainer.style.display = expandedIngredients.has(name) ? 'block' : 'none';
    
        ingredientData.dates.forEach((date, index) => {
          const bestBeforeDate = ingredientData.bestBeforeDates[index];
          const dateBox = document.createElement('div');
          dateBox.classList.add('date-box');
    
          // Ensure best before date is valid
          if (bestBeforeDate && bestBeforeDate !== 'Invalid Date') {
            dateBox.textContent = `Entry Date: ${date} | Best Before: ${bestBeforeDate}`;
          } else {
            dateBox.textContent = `Entry Date: ${date} | Best Before: Unknown`;
          }
    
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

    // Global variable for storing items to be inserted/removed into the CSV
	let itemsToInsert = [];
	let itemsToRemove = [];

	// Function to show the session review modal
  async function showSessionReviewModal(items) {
    sessionItemsContainer.innerHTML = ''; // Clear previous items
    itemsToInsert = []; // Clear itemsToInsert array for fresh session
    itemsToRemove = []; // Clear itemsToRemove array for fresh session
  
    // Wait for barcode lookups and prepare item data
    await Promise.all(items.map(async (item, index) => {
      let { name, barcode, direction } = item;
  
      // Fetch the name for the barcode if the name is not available
      if (!name && barcode) {
        name = await fetchProductNameFromBarcode(barcode);
      }
  
      // Create a unique identifier for each item based on its index
      const itemIdentifier = name || barcode || `Item ${index + 1}`;
  
      const itemRow = document.createElement('div');
      itemRow.classList.add('item-row');
  
      // Create a non-editable text span for the item name or barcode
      const nameSpan = document.createElement('span');
      nameSpan.textContent = `${itemIdentifier} (${direction === 'in' ? 'Going IN' : 'Going OUT'})`;
      nameSpan.classList.add('item-name-span');
  
      // Create a dropdown to choose status (Going IN / Going OUT)
      const statusDropdown = document.createElement('select');
      const inOption = new Option('Going IN', 'in', false, direction === "in");
      const outOption = new Option('Going OUT', 'out', false, direction === "out");
      statusDropdown.append(inOption, outOption);
      statusDropdown.classList.add('item-status-dropdown');
  
      // Create the Confirm button
      const confirmButton = document.createElement('button');
      confirmButton.textContent = 'Confirm';
      confirmButton.classList.add('confirm-button');
      confirmButton.addEventListener('click', () => {
        // Determine the status from the dropdown and push items to respective arrays
        const status = statusDropdown.value === 'in';
  
        if (status) {
          // Add item to itemsToInsert array for server submission
          itemsToInsert.push({
            name: itemIdentifier,
            date: formatDate(new Date()), // Use formatDate function for correct date format
          });
        } else {
          // Add item to itemsToRemove array for server submission
          itemsToRemove.push({
            name: itemIdentifier,
          });
        }
  
        // Disable confirm button to indicate that this item has been confirmed
        confirmButton.disabled = true;
        statusDropdown.disabled = true;
      });
  
      // Append elements to the item row
      itemRow.appendChild(nameSpan);
      itemRow.appendChild(statusDropdown);
      itemRow.appendChild(confirmButton);
      sessionItemsContainer.appendChild(itemRow);
    }));
  
    // Show the modal
    sessionModal.classList.add('show');  

	  // Close button logic in the modal
	  exitSessionReviewButton.addEventListener('click', function () {
		  console.log("Close button clicked"); // Debug log to check if button is triggered
		  sessionModal.classList.remove('show'); // Close the modal
		  console.log("Modal should be hidden now"); // Debug log to verify modal hide

		  let addSuccess = true;
		  let removeSuccess = true;

		  // Handle the addition of confirmed items
		  if (itemsToInsert.length > 0) {
			//console.log("Items to add:", itemsToInsert); // Debug log to see items to be added
			fetch('/addConfirmedItems', {
			  method: 'POST',
			  headers: { 'Content-Type': 'application/json' },
			  body: JSON.stringify(itemsToInsert),
			})
			  .then(response => {
				if (response.ok) {
				  //console.log("Items added successfully");
				} else {
				  //console.error("Failed to add items");
				  alert('Failed to add items.');
				  addSuccess = false;
				}
			  })
			  .then(() => {
				// After attempting to add items, handle removal
				if (itemsToRemove.length > 0) {
				  //console.log("Items to remove:", itemsToRemove); // Debug log to see items to be removed
				  return fetch('/removeConfirmedItems', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(itemsToRemove),
				  });
				} else {
				  //console.log("No items to remove");
				  return null; // No items to remove, so return null
				}
			  })
			  .then(removeResponse => {
				if (removeResponse) {
				  if (removeResponse.ok) {
					//console.log("Items removed successfully");
				  } else {
					//console.error("Failed to remove items");
					alert('Failed to remove items.');
					removeSuccess = false;
				  }
				}
			  })
			  .then(() => {
				// Refresh the ingredients list only if both add and remove were successful
				if (addSuccess && removeSuccess) {
				  //console.log("Fetching updated ingredients");
				  fetchIngredients();
				}
			  })
			  .catch(error => {
				console.error('Error during item operations:', error);
				alert('An error occurred while processing your request. Please try again.');
			  });

		  } else if (itemsToRemove.length > 0) {
			// Handle removal if there are no items to add
			//console.log("Items to remove only:", itemsToRemove);
			fetch('/removeConfirmedItems', {
			  method: 'POST',
			  headers: { 'Content-Type': 'application/json' },
			  body: JSON.stringify(itemsToRemove),
			})
			  .then(response => {
				if (response.ok) {
				  //console.log("Items removed successfully");
				  //alert('Items have been removed successfully.');
				  removeSuccess = true;
				} else {
				  console.error("Failed to remove items");
				  alert('Failed to remove items.');
				  removeSuccess = false;
				}
			  })
			  .then(() => {
				if (removeSuccess) {
				  //console.log("Fetching updated ingredients");
				  fetchIngredients();
				}
			  })
			  .catch(error => {
				console.error('Error during item operations:', error);
				alert('An error occurred while processing your request. Please try again.');
			  });
		  }
		});
	}

// Check if the session review modal should be shown after session completion
const showSessionModal = localStorage.getItem('showSessionModal');
if (showSessionModal === 'true') {
  localStorage.removeItem('showSessionModal'); // Clear the flag
  const newItemsData = JSON.parse(localStorage.getItem('newItemsData') || '{}');
  //console.log("Retrieved items from localStorage:", newItemsData);

  // Check if newItemsData has 'items' that is an array
  if (newItemsData && newItemsData.newItems && Array.isArray(newItemsData.newItems)) {
    showSessionReviewModal(newItemsData.newItems); // Pass only the items array to the modal
  } else {
    console.error("Invalid items data for session review:", newItemsData);
  }
}

  function checkForExpiringItems(data) {
    const today = new Date();
    const expiringItems = [];
    let expiredCount = 0;

    data.forEach(item => {
      const bestBeforeDate = new Date(item.best_before_date);
      const daysDiff = Math.ceil((bestBeforeDate - today) / (1000 * 3600 * 24));

      if (daysDiff <= 3 && daysDiff >= 0) {
        expiringItems.push(`${item.name} (Expires in ${daysDiff} days)`);
        expiredCount++;
      } else if (daysDiff < 0) {
        expiringItems.push(`${item.name} (Expired ${Math.abs(daysDiff)} days ago)`);
        expiredCount++;
      }
    });

    const notificationCounter = document.getElementById('notificationCounter');
    
    if (expiredCount > 0) {
      notificationBell.classList.add('has-notifications');
      if (!notificationSoundPlayed) {
        notificationSound.play();
        notificationSoundPlayed = true;
      }
      showDropdown(expiringItems);

      // Show the red notification counter
      notificationCounter.classList.remove('hidden');
    } else {
      notificationBell.classList.remove('has-notifications');
      dropdownMenu.innerHTML = '';

      // Hide the red notification counter
      notificationCounter.classList.add('hidden');
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
			  // console.log('Parsed CSV data:', results.data);
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
