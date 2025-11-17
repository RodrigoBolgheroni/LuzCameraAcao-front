document.addEventListener("DOMContentLoaded", async () => {
  console.log("home.js carregado!");
  console.log("Verificando dependências...");
  console.log("AuthService existe?", typeof AuthService !== 'undefined');
  console.log("MovieService existe?", typeof MovieService !== 'undefined');
  console.log("InteractionService existe?", typeof InteractionService !== 'undefined');

  if (typeof AuthService === 'undefined') {
    console.error("AuthService não foi carregado! Verifique se api.js está antes de home.js no HTML");
    return;
  }

  if (!AuthService.isAuthenticated()) {
    console.log("Usuário não autenticado, redirecionando...");
    window.location.href = '../index.html';
    return;
  }

  const user = AuthService.getUser();
  console.log('Usuário logado:', user);

  updateUserUI(user);
  await loadMoviesByCategories();
  setupLogout();
});

function updateUserUI(user) {
  const userNameElement = document.querySelector('.user-name');
  if (userNameElement) {
    userNameElement.textContent = user.username || user.email;
  }
}

async function loadMoviesByCategories() {
  try {
    // Carrega todos os filmes
    let moviesRaw = await MovieService.findAllMovies();
    const movies = Array.isArray(moviesRaw) ? moviesRaw : (moviesRaw?.data || []);

    if (!movies || movies.length === 0) {
      console.warn('Nenhum filme encontrado');
      return;
    }

    // Carrega interações do usuário
    const user = AuthService.getUser();
    console.log("Carregando interações do usuário ID:", user.id);

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

      if (tipo === 'RATING' && nota !== null && nota !== undefined) {
        ratingsMap[filmId] = nota;
      }
      if (tipo === 'FAVORITE') {
        favoritesSet.add(filmId);
      }
    });

    // Organiza filmes por categoria
    const categorias = {
      recentes: { 
        selector: '[data-category="recentes"]',
        filter: (movie) => {
          const ano = movie.ano || movie.year || 0;
          return ano >= 2020; // Filmes de 2020 em diante
        }
      },
      acao: { 
        selector: '[data-category="acao"]',
        filter: (movie) => {
          const genero = (movie.categoria || movie.categoria || '').toLowerCase();
          return genero.includes('ação') || genero.includes('action');
        }
      },
      drama: { 
        selector: '[data-category="drama"]',
        filter: (movie) => {
          const genero = (movie.categoria || movie.categoria || '').toLowerCase();
          return genero.includes('drama');
        }
      },
      comedia: { 
        selector: '[data-category="comedia"]',
        filter: (movie) => {
          const genero = (movie.categoria || movie.categoria || '').toLowerCase();
          return genero.includes('comédia') || genero.includes('comedy');
        }
      }
    };

    Object.keys(categorias).forEach(categoryKey => {
      const category = categorias[categoryKey];
      const movieGrid = document.querySelector(category.selector);
      
      if (!movieGrid) return;

      movieGrid.innerHTML = '<p style="text-align: center; color: white;">Carregando filmes...</p>';

      let filteredMovies = movies.filter(category.filter);
      

      if (filteredMovies.length === 0) {
        filteredMovies = movies.slice(0);
      }

      // Embaralha e pega apenas 5 filmes
      filteredMovies.sort(() => Math.random() - 0.5);
      const selectedMovies = filteredMovies.slice(0, 5);

      if (selectedMovies.length === 0) {
        movieGrid.innerHTML = '<p style="text-align: center; color: white;">Nenhum filme encontrado nesta categoria.</p>';
        return;
      }

      movieGrid.innerHTML = '';
      selectedMovies.forEach(movie => {
        const userRating = ratingsMap[movie.id] || 0;
        const isFavorite = favoritesSet.has(movie.id);
        const movieCard = createMovieCard(movie, userRating, isFavorite);
        movieGrid.appendChild(movieCard);
      });
    });

    setupStarRatings();
  } catch (error) {
    console.error('Erro ao carregar filmes:', error);
    const grids = document.querySelectorAll('.movie-grid');
    grids.forEach(grid => {
      grid.innerHTML = `<p style="text-align: center; color: red;">Erro ao carregar filmes: ${error.message}</p>`;
    });
  }
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
  console.log('Configurando sistema de avaliação...');
  
  const movieCards = document.querySelectorAll(".movie-card");
  console.log('Cards encontrados:', movieCards.length);

  movieCards.forEach((card, index) => {
    const stars = card.querySelectorAll(".stars-selection span[data-star]");
    const movieId = parseInt(card.dataset.movieId);

    if (!stars.length || !movieId) {
      return;
    }

    stars.forEach(star => {
      star.replaceWith(star.cloneNode(true));
    });

    const newStars = card.querySelectorAll(".stars-selection span[data-star]");

    newStars.forEach(star => {
      star.addEventListener("click", async (e) => {
        e.stopPropagation();
        const rating = parseInt(star.getAttribute("data-star"));

        // Atualiza visualmente
        newStars.forEach(s => s.classList.remove("selected"));
        for (let i = 0; i < rating; i++) {
          newStars[i].classList.add("selected");
        }

        try {
          await InteractionService.rateMovie(movieId, rating);
          console.log(`Avaliação ${rating} enviada para filme ${movieId}`);
        } catch (error) {
          console.error('Erro ao enviar avaliação:', error);
        }
      });
    });

    const favBtn = card.querySelector('.btn-favorite');
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

function setupLogout() {
  const actions = document.querySelector('.actions');
  if (actions && !document.querySelector('.btn-logout')) {
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-logout';
    logoutBtn.textContent = 'Sair';
    logoutBtn.addEventListener('click', () => {
      if (confirm('Deseja realmente sair?')) {
        AuthService.logout();
      }
    });
    actions.appendChild(logoutBtn);
  }
}