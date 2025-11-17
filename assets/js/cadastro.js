document.addEventListener("DOMContentLoaded", () => {
    console.log(" cadastro.js carregado!");
  
    const form = document.querySelector('.register-box');
  
    form.addEventListener('submit', (e) => {
      e.preventDefault();
  
      const username = form.querySelector('input[type="text"]').value.trim();
      const email = form.querySelector('input[type="email"]').value.trim();
      const password = form.querySelectorAll('input[type="password"]')[0].value.trim();
      const confirmPassword = form.querySelectorAll('input[type="password"]')[1].value.trim();
  
      if (!username || !email || !password || password !== confirmPassword) {
        alert('Verifique os campos');
        return;
      }
  
      // Simula registro local
      localStorage.setItem('fakeUser', JSON.stringify({ username, email, password }));
      alert('Cadastro simulado com sucesso! Faça login.');
      window.location.href = '/index.html';
    });
  });
  