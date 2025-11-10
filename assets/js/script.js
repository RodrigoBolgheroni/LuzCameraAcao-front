document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ script.js carregado!");
  
    const divFilme = document.getElementsByClassName("movie-card");
  
    Array.from(divFilme).forEach(card => {
      const stars = card.querySelectorAll(".stars-selection span[data-star]");
      if (!stars.length) return;
  
      stars.forEach(star => {
        star.addEventListener("click", () => {
          const rating = parseInt(star.getAttribute("data-star"));
  
          stars.forEach(s => s.classList.remove("selected"));
  
          for (let i = 0; i < rating; i++) {
            stars[i].classList.add("selected");
          }
  
          const movieName = card.querySelector("h3").innerText;
          localStorage.setItem(movieName, rating);
        });
      });
  
      const movieName = card.querySelector("h3").innerText;
      const savedRating = localStorage.getItem(movieName);
      if (savedRating) {
        const rating = parseInt(savedRating);
        for (let i = 0; i < rating; i++) {
          stars[i].classList.add("selected");
        }
      }
    });
  });
  