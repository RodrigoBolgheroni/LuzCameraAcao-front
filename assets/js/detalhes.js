document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const movieId = parseInt(params.get("id"));
    if (!movieId) {
      document.getElementById("detalhes-container").innerHTML = '<p class="empty-state">Filme não encontrado.</p>';
      return;
    }

    try {
      const filmes = await MovieService.findAllMovies();
      const movie = filmes.find(f => f.id === movieId);

      if (!movie) {
        document.getElementById("detalhes-container").innerHTML = '<p class="empty-state">Filme não encontrado.</p>';
        return;
      }

      const userInteractionsRaw = await InteractionService.findByUserInteractions(1); // usuário logado
      const userInteractions = Array.isArray(userInteractionsRaw) ? userInteractionsRaw : [];
      const userRatingObj = userInteractions.find(i => i.idFilme === movieId && i.tipo === 'RATING');
      const userRating = userRatingObj ? userRatingObj.nota : 0;
      const isFavorite = userInteractions.some(i => i.idFilme === movieId && i.tipo === 'FAVORITE');

      const container = document.getElementById("detalhes-container");
      container.innerHTML = `
<div class="movie-details">
  <div class="movie-poster">
    <img src="${movie.imagem}" alt="${movie.nome}">
  </div>
  <div class="movie-info">
    <h1>${movie.nome}</h1>
    <p>
      <span class="genre">${movie.categoria}</span>
      <span class="year">${movie.ano}</span>
      <span class="rating">⭐ ${movie.rating || 4.0}</span>
    </p>
    <p>${movie.descricao}</p>

    <div class="stars-selection">
      <span data-star="1" class="${userRating >= 1 ? 'selected' : ''}">☆</span>
      <span data-star="2" class="${userRating >= 2 ? 'selected' : ''}">☆</span>
      <span data-star="3" class="${userRating >= 3 ? 'selected' : ''}">☆</span>
      <span data-star="4" class="${userRating >= 4 ? 'selected' : ''}">☆</span>
      <span data-star="5" class="${userRating >= 5 ? 'selected' : ''}">☆</span>
    </div>

    <button class="btn-favorite">${isFavorite ? "❤️ Remover dos Favoritos" : "🤍 Adicionar aos Favoritos"}</button>
    <a href="${movie.link}" target="_blank" class="btn-imdb">🔗 Ver no TMDb</a>

  </div>
</div>
`;


      // Setup estrelas
      const stars = container.querySelectorAll(".stars-selection span");
      stars.forEach(star => {
        star.addEventListener("click", async () => {
          const rating = parseInt(star.dataset.star);
          stars.forEach(s => s.classList.remove("selected"));
          for (let i = 0; i < rating; i++) stars[i].classList.add("selected");
          await InteractionService.rateMovie(movieId, rating);
        });
      });

      // Favorito
      const favBtn = container.querySelector(".btn-favorite");
      favBtn.addEventListener("click", async () => {
        try {
          await InteractionService.addToFavorites(movieId);
          favBtn.textContent = favBtn.textContent.includes('❤️') ? '🤍 Adicionar aos Favoritos' : '❤️ Remover dos Favoritos';
        } catch (error) {
          console.error("Erro ao favoritar:", error);
        }
      });

    } catch (error) {
      document.getElementById("detalhes-container").innerHTML = `<p class="empty-state">Erro ao carregar detalhes: ${error.message}</p>`;
    }
  });

  function buscar() {
    const termo = document.getElementById("searchInput").value.trim();
    if (termo) {
      window.location.href = `/pages/explorar.html?query=${encodeURIComponent(termo)}`;
    } else {
      window.location.href = `/pages/explorar.html`;
    }
  }