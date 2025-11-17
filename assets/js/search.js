console.log("explorar.js carregado!");

document.addEventListener("DOMContentLoaded", async () => {
  const query = new URLSearchParams(window.location.search).get("query");
  if (query) {
    document.getElementById("searchInput").value = query;
    await searchMovies(query);
  } else {
    await carregarFilmes();
  }
});

async function carregarFilmes() {
  try {
    const filmes = await MovieService.getAllMovies(); 
    renderizarFilmes(filmes);
  } catch (error) {
    console.error("Erro ao carregar filmes:", error);
    document.getElementById("explorar-container").innerHTML = 
      `<p class="empty-state">Erro ao carregar filmes.</p>`;
  }
}

function renderizarFilmes(filmes) {
  const container = document.getElementById("explorar-container");
  if (!filmes || filmes.length === 0) {
    container.innerHTML = `<p class="empty-state">Nenhum filme encontrado.</p>`;
    return;
  }

  container.innerHTML = filmes.map(filme => `
    <div class="movie-card">
      <img src="${filme.imagem}" alt="${filme.nome}">
      <h3>${filme.nome}</h3>
      <p>${filme.ano}</p>
      <button onclick="verDetalhes(${filme.id})">Ver Detalhes</button>
    </div>
  `).join('');
}

async function searchMovies(queryText) {
  const termo = queryText || document.getElementById("searchInput").value.trim();
  if (termo === "") {
    carregarFilmes();
    return;
  }

  try {
    const filmes = await MovieService.searchMovies(termo); 
    renderizarFilmes(filmes);
  } catch (error) {
    console.error("Erro na busca:", error);
  }
}

function verDetalhes(id) {
  window.location.href = `detalhes.html?id=${id}`;
}
