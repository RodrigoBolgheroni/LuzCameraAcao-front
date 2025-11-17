console.log("💖 favoritos.js carregado!");

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("favoritos-container");

  if (!AuthService.isAuthenticated()) {
    container.innerHTML = "<p class='empty-state'>⚠️ Usuário não autenticado.</p>";
    return;
  }

  const user = AuthService.getUser();
  console.log("👤 Usuário logado:", user);

  try {
    // Puxa interações do usuário
    const interacoesRaw = await InteractionService.findByUserInteractions(user.id);
    const interacoes = Array.isArray(interacoesRaw)
      ? interacoesRaw
      : interacoesRaw?.data || interacoesRaw?.interactions || [];

    const ratingsMap = {};
    const favoritesSet = new Set();

    interacoes.forEach(i => {
      const tipo = i.tipo || i.type;
      const filmId = i.idFilme || i.movieId || i.movie_id;
      const nota = i.nota !== undefined ? i.nota : i.rating;

      if (tipo === "RATING" && nota != null) ratingsMap[filmId] = nota;
      if (tipo === "FAVORITE") favoritesSet.add(filmId);
    });

    if (favoritesSet.size === 0) {
      container.innerHTML = "<p class='empty-state'>Você ainda não tem filmes favoritados.</p>";
      return;
    }

    // Busca todos os filmes
    const filmesRaw = await MovieService.findAllMovies();
    const filmes = Array.isArray(filmesRaw) ? filmesRaw : filmesRaw?.data || [];

    // Filtra apenas os filmes marcados como favoritos
    const filmesFavoritos = filmes.filter(f => favoritesSet.has(f.id));

    container.innerHTML = "";

    filmesFavoritos.forEach(filme => {
      const userRating = ratingsMap[filme.id] || 0;
      const card = createMovieCard(filme, userRating, true);
      container.appendChild(card);
    });

    setupStarRatings();
  } catch (error) {
    console.error("Erro ao carregar favoritos:", error);
    container.innerHTML = "<p class='empty-state'>Erro ao carregar seus filmes favoritos.</p>";
  }
});

function createMovieCard(movie, userRating = 0, isFavorite = false) {
  const card = document.createElement('div');
  card.className = 'movie-card';
  card.dataset.movieId = movie.id;

  const titulo = movie.nome || movie.title || 'Sem título';
  const imagem = movie.imagem && movie.imagem !== 'a'
    ? movie.imagem
    : 'https://via.placeholder.com/300x450?text=Sem+Imagem';
  const ano = movie.ano || movie.year || 'N/A';
  const nota = (movie.rating || 4.0).toFixed(1);
  
  card.innerHTML = `
    <img src="${imagem}" alt="${titulo}" />
    <h3 class="movie-title">${titulo}</h3>
    <p>⭐ ${nota} | ${ano}</p>

    <div class="stars-selection">
      <span data-star="1" class="${userRating >= 1 ? 'selected' : ''}">☆</span>
      <span data-star="2" class="${userRating >= 2 ? 'selected' : ''}">☆</span>
      <span data-star="3" class="${userRating >= 3 ? 'selected' : ''}">☆</span>
      <span data-star="4" class="${userRating >= 4 ? 'selected' : ''}">☆</span>
      <span data-star="5" class="${userRating >= 5 ? 'selected' : ''}">☆</span>
    </div>

    <button class="btn-favorite" data-movie-id="${movie.id}">
      ${isFavorite ? "❤️ Remover" : "🤍 Favoritar"}
    </button>
  `;

  // Clique no card ou no título leva para detalhes
  card.addEventListener('click', (e) => {
    if (!e.target.closest('.stars-selection') && !e.target.closest('.btn-favorite')) {
      window.location.href = `/pages/detalhes.html?id=${movie.id}`;
    }
  });

  return card;
}


function setupStarRatings() {
  console.log("Configurando sistema de avaliação...");
  const movieCards = document.querySelectorAll(".movie-card");

  movieCards.forEach(card => {
    const stars = card.querySelectorAll(".stars-selection span[data-star]");
    const movieId = parseInt(card.dataset.movieId);

    if (!stars.length || !movieId) return;

    stars.forEach(star => {
      star.addEventListener("click", async (e) => {
        e.stopPropagation();
        const rating = parseInt(star.getAttribute("data-star"));

        stars.forEach(s => s.classList.remove("selected"));
        for (let i = 0; i < rating; i++) stars[i].classList.add("selected");

        try {
          await InteractionService.rateMovie(movieId, rating);
          console.log(`Avaliação ${rating} enviada para filme ${movieId}`);
        } catch (error) {
          console.error("Erro ao enviar avaliação:", error);
        }
      });

      star.addEventListener("mouseenter", () => {
        stars.forEach(s => s.classList.remove("hovered"));
        for (let i = 0; i < parseInt(star.dataset.star); i++) stars[i].classList.add("hovered");
      });

      star.addEventListener("mouseleave", () => {
        stars.forEach(s => s.classList.remove("hovered"));
      });
    });
  });
}
