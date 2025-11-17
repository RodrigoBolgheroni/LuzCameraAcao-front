  const API_BASE_URL = "https://streaming-movie-api.onrender.com/api";

  class AuthService {
    static _user = {
      id: 1,
      username: "Rodrigo",
      email: "rodrigobolgheroni1@gmail.com",
      idade: 18
    };
    static _token = "token-fixo";

    static getToken() {
      return this._token;
    }

    static setToken(token) {
      this._token = token;
    }

    static removeToken() {
      this._token = null;
    }

    static getUser() {
      return this._user;
    }

    static setUser(user) {
      this._user = user;
    }

    static removeUser() {
      this._user = null;
    }

    static isAuthenticated() {
      return !!this._token;
    }

    static logout() {
      this.removeToken();
      this.removeUser();
      window.location.href = '../index.html';
    }
  }


  class ApiClient {
    static async request(endpoint, options = {}) {
      const url = `${API_BASE_URL}${endpoint}`;
      const token = AuthService.getToken();

      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        ...options,
      };

      try {
        console.log(`📡 ${options.method || 'GET'} ${endpoint}`);
        if (options.body) {
          console.log('📤 Body:', JSON.parse(options.body));
        }
        
        const response = await fetch(url, config);
        
        console.log(`📥 Response status: ${response.status}`);

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || `Erro HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log(' Response data:', data);
        return data;
      } catch (err) {
        console.error(' Erro na requisição:', err);
        throw err;
      }
    }

    static async get(endpoint) {
      return this.request(endpoint, { method: 'GET' });
    }

    static async post(endpoint, data) {
      return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) });
    }

    static async put(endpoint, data) {
      return this.request(endpoint, { method: 'PUT', body: JSON.stringify(data) });
    }

    static async delete(endpoint) {
      return this.request(endpoint, { method: 'DELETE' });
    }
  }

  class MovieService {
    
    static async createMovie(movieData) {
      return ApiClient.post('/movie/create', movieData);
    }

    static async findAllMovies() {
      const response = await ApiClient.get('/movie');
      return Array.isArray(response)
        ? response
        : (response?.data || []);
    }

    static async updateMovie(id, movieData) {
      return ApiClient.put(`/movie/update/${id}`, movieData);
    }

    static async deleteMovie(id) {
      return ApiClient.delete(`/movie/delete/${id}`);
    }
  }


  class InteractionService {
    static async createInteraction(interactionData) {
      return ApiClient.post('/interactions/create', interactionData);
    }

    static async findAllInteractions() {
      return ApiClient.get('/interactions');
    }

    static async findByUserInteractions(userId) {
      const idStr = String(userId);
    
      try {
        const response = await ApiClient.get(`/interactions?userId=${encodeURIComponent(idStr)}`);
        const interactions = Array.isArray(response) 
          ? response 
          : (response?.data || response?.interactions || []);
        
        console.log(' Interações recebidas:', interactions);
        return interactions;
      } catch (err) {
        console.warn('GET /interactions?userId=... falhou:', err.message || err);
        
        try {
          const response = await ApiClient.get(`/interactions/user/${encodeURIComponent(idStr)}`);
          const interactions = Array.isArray(response) 
            ? response 
            : (response?.data || response?.interactions || []);
          
          console.log('Interações recebidas (rota alternativa):', interactions);
          return interactions;
        } catch (err2) {
          console.warn('GET /interactions/user/{id} falhou:', err2.message || err2);
          return [];
        }
      }
    }

    static async deleteInteraction(id) {
      return ApiClient.delete(`/interactions/delete/${id}`);
    }

    static async rateMovie(movieId, rating) {
      const user = AuthService.getUser();
      if (!user) throw new Error('Usuário não autenticado');
    
      console.log(' INICIANDO AVALIAÇÃO');
      console.log('Usuário:', user);
      console.log('Filme ID:', movieId);
      console.log('Nota:', rating);
    
      const payload = {
        idUsuario: user.id,
        idFilme: movieId,
        tipo: 'RATING',
        nota: rating,
        data: new Date().toISOString()
      };
    
      console.log('Payload final:', payload);
    
      try {
        const result = await ApiClient.post('/interactions/create', payload);
        console.log('Avaliação enviada com sucesso!', result);
        return result;
      } catch (error) {
        console.error('Erro ao enviar avaliação:', error);
        alert('Ocorreu um erro ao enviar sua avaliação. Tente novamente mais tarde.');
        throw error;
      }
    }
    

    static async addToFavorites(movieId) {
      const user = AuthService.getUser();
      if (!user) throw new Error('Usuário não autenticado');
  
      const payload = {
        idUsuario: user.id,
        idFilme: movieId,
        tipo: 'FAVORITE',
        nota: null,
        data: new Date().toISOString()
      };
  
      try {
        // Verifica se já existe
        const interactions = await this.findByUserInteractions(user.id);
        const existing = interactions.find(i => (i.idFilme || i.movieId) === movieId && (i.tipo || i.type) === 'FAVORITE');
  
        if (existing) {
          // Se já existe, remove
          await this.deleteInteraction(existing.id);
          return { removed: true };
        } else {
          // Cria novo favorito
          const result = await ApiClient.post('/interactions/create', payload);
          return { removed: false, result };
        }
      } catch (err) {
        console.error('❌ Erro ao alternar favorito:', err);
        throw err;
      }
    }
    static async consultInteractByUser(userId) {
      const user = AuthService.getUser();
      if (!user) throw new Error("Usuário não autenticado");
    
      try {
        console.log(` Buscando favoritos do usuário ${userId}...`);
        const response = await ApiClient.get(`/interactions?userId=${userId}`);
        
        const interactions = Array.isArray(response)
          ? response
          : (response?.data || response?.interactions || []);
    
        // Filtra apenas os do tipo FAVORITE
        const favoritos = interactions.filter(
          (i) => i.tipo === "FAVORITE" || i.type === "FAVORITE"
        );
    
        console.log(" Favoritos encontrados:", favoritos);
        return favoritos;
      } catch (err) {
        console.error(" Erro ao buscar favoritos:", err);
        return [];
      }
    }
    static async removeFavorite(movieId) {
      const user = AuthService.getUser();
      if (!user) throw new Error("Usuário não autenticado");
  
      const interactions = await this.findByUserInteractions(user.id);
      const fav = interactions.find(i => (i.idFilme || i.movieId) === movieId && (i.tipo || i.type) === 'FAVORITE');
  
      if (fav) {
        return this.deleteInteraction(fav.id);
      }
    }
    
  }


  window.AuthService = AuthService;
  window.ApiClient = ApiClient;
  window.MovieService = MovieService;
  window.InteractionService = InteractionService;

  console.log(' api.js carregado com sucesso!');