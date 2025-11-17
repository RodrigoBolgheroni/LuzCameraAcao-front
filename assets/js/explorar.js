console.log(" explorar.js carregado!");

document.addEventListener("DOMContentLoaded", async () => {
  console.log(" Verificando dependências...");
  console.log("AuthService existe?", typeof AuthService !== "undefined");
  console.log("MovieService existe?", typeof MovieService !== "undefined");
  console.log("InteractionService existe?", typeof InteractionService !== "undefined");

  if (typeof AuthService === "undefined") {
    console.error("AuthService não foi carregado! Verifique se api.js está antes de explorar.js no HTML");
    return;
  }

  if (!AuthService.isAuthenticated()) {
    console.log("Usuário não autenticado, redirecionando...");
    window.location.href = "/index.html";
    return;
  }

  const user = AuthService.getUser();
  console.log("Usuário logado:", user);

  updateUserUI(user);

  const query = new URLSearchParams(window.location.search).get("query");
  if (query) {
    document.getElementById("searchInput").value = query;
    await searchMovies(query);
  } else {
    await carregarFilmes();
  }

  setupLogout();
});

function updateUserUI(user) {
  const userNameElement = document.querySelector(".user-name");
  if (userNameElement) {
    userNameElement.textContent = user.username || user.email;
  }
}

async function carregarFilmes() {
  try {
    let moviesRaw = await MovieService.findAllMovies();
    const filmes = Array.isArray(moviesRaw) ? moviesRaw : (moviesRaw?.data || []);

    if (!filmes.length) {
      document.getElementById("explorar-container").innerHTML =
        `<p class="empty-state">Nenhum filme encontrado.</p>`;
      return;
    }

    const user = AuthService.getUser();
    let userInteractionsRaw = await InteractionService.findByUserInteractions(user.id);
    const userInteractions = Array.isArray(userInteractionsRaw)
      ? userInteractionsRaw
      : (userInteractionsRaw?.data || userInteractionsRaw?.interactions || []);

    const ratingsMap = {};
    const favoritesSet = new Set();

    userInteractions.forEach(interaction => {
      const tipo = interaction.tipo || interaction.type;
      const filmId = interaction.idFilme || interaction.movieId || interaction.movie_id;
      const nota = interaction.nota !== undefined ? interaction.nota : interaction.rating;

      if (tipo === "RATING" && nota != null) ratingsMap[filmId] = nota;
      if (tipo === "FAVORITE") favoritesSet.add(filmId);
    });

    renderizarFilmes(filmes, ratingsMap, favoritesSet);
    setupStarRatings();
  } catch (error) {
    console.error("Erro ao carregar filmes:", error);
    document.getElementById("explorar-container").innerHTML =
      `<p class="empty-state">Erro ao carregar filmes: ${error.message}</p>`;
  }
}

function renderizarFilmes(filmes, ratingsMap = {}, favoritesSet = new Set()) {
  const container = document.getElementById("explorar-container");
  if (!filmes || filmes.length === 0) {
    container.innerHTML = `<p class="empty-state">Nenhum filme encontrado.</p>`;
    return;
  }

  container.innerHTML = "";
  filmes.forEach(filme => {
    const userRating = ratingsMap[filme.id] || 0;
    const isFavorite = favoritesSet.has(filme.id);
    const card = createMovieCard(filme, userRating, isFavorite);
    container.appendChild(card);
  });
}

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
    });

    const favBtn = card.querySelector(".btn-favorite");
    if (favBtn) {
      favBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        try {
          const res = await InteractionService.addToFavorites(movieId);
          favBtn.textContent = res.removed ? "🤍 Favoritar" : "❤️ Remover";
        } catch (error) {
          console.error("Erro ao alternar favorito:", error);
        }
      });
      
    }
  });
}

async function searchMovies(queryText) {
  const termo = queryText || document.getElementById("searchInput").value.trim();
  if (!termo) {
    await carregarFilmes();
    return;
  }

  try {
    const filmes = await MovieService.findAllMovies();
    const filtrados = filmes.filter(f =>
      (f.nome || "").toLowerCase().includes(termo.toLowerCase()) ||
      (f.descricao || "").toLowerCase().includes(termo.toLowerCase()) ||
      String(f.ano || "").includes(termo)
    );
    await carregarFilmes(filtrados);
    renderizarFilmes(filtrados);
  } catch (error) {
    console.error("Erro na busca:", error);
  }
}

function setupLogout() {
  const actions = document.querySelector(".actions");
  if (actions && !document.querySelector(".btn-logout")) {
    const logoutBtn = document.createElement("button");
    logoutBtn.className = "btn btn-logout";
    logoutBtn.textContent = "Sair";
    logoutBtn.addEventListener("click", () => {
      if (confirm("Deseja realmente sair?")) {
        AuthService.logout();
      }
    });
    actions.appendChild(logoutBtn);
  }
}
