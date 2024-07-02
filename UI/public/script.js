const button = document.getElementById('learnMoreButton');
button.addEventListener('click', function(e){
    console.log('button was clicked');

    fetch('/clicked', {method: 'POST'})
      .then(function(response){
        if(response.ok){
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
      .catch(function(error){
          console.log(error);
      });
});

document.addEventListener('DOMContentLoaded', function() {
  var learnMoreButton = document.getElementById('aboutButton');
  learnMoreButton.addEventListener('click', function() {
    window.location.href = 'http://localhost:8080/About.html'; // Replace with your desired URL
  });
});

document.addEventListener('DOMContentLoaded', function() {
  var learnMoreButton = document.getElementById('contactButton');
  learnMoreButton.addEventListener('click', function() {
    window.location.href = 'http://localhost:8080/ContactUs.html'; // Replace with your desired URL
  });
});