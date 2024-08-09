document.addEventListener('DOMContentLoaded', function() {
  // Fetch and update ingredients every second
  setInterval(fetchIngredients, 1000); // 1000 milliseconds

  function fetchIngredients() {
    fetch('Ingredients.csv')
      .then(response => response.text())
      .then(text => {
        Papa.parse(text, {
          header: true,
          complete: function(results) {
            console.log('CSV parsing complete');
            console.log(results); // Log the entire results object
            displayIngredients(results.data);
          },
          error: function(error) {
            console.error('Error parsing CSV:', error);
          }
        });
      })
      .catch(error => console.error('Error fetching CSV:', error));
  }

  // Add event listeners to buttons
  document.getElementById('learnMoreButton')?.addEventListener('click', function(e) {
    console.log('learnMoreButton was clicked');
    fetch('/clicked', {method: 'POST'})
      .then(function(response) {
        if (response.ok) {
          console.log('Click was recorded');
          var windowHeight = window.innerHeight;
          window.scrollTo({
            top: windowHeight,
            behavior: 'smooth'
          });
          return;
        }
        throw new Error('Request failed.');
      })
      .catch(function(error) {
        console.log(error);
      });
  });

  document.getElementById('aboutButton')?.addEventListener('click', function() {
    window.location.href = 'http://localhost:8080/About.html'; // Replace with your desired URL
  });

  document.getElementById('contactButton')?.addEventListener('click', function() {
    window.location.href = 'http://localhost:8080/Contact.html'; // Replace with your desired URL
  });

  document.getElementById('productsButton')?.addEventListener('click', function() {
    window.location.href = 'http://localhost:8080/MyIngredients.html'; // Replace with your desired URL
  });
});

function displayIngredients(data) {
  console.log('Displaying ingredients');
  const ingredientsList = document.getElementById('ingredientsList');
  if (!ingredientsList) {
    console.error('Element with ID "ingredientsList" not found.');
    return;
  }

  ingredientsList.innerHTML = ''; //Clear content for refresh
  data.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.classList.add('ingredient-item');
    itemDiv.textContent = item.name;
    ingredientsList.appendChild(itemDiv);
  });
}
