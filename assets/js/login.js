document.addEventListener("DOMContentLoaded", () => {
  console.log("login.js carregado!");

  const form = document.querySelector('.register-box') || document.querySelector('form');

  if (!form) {
    console.error("Form de login não encontrado!");
    return;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const defaultUser = {
      id: 1,
      username: "Rodrigo",
      email: "rodrigobolgheroni1@gmail.com",
      idade: 18,
    };

    AuthService.setUser(defaultUser);
    AuthService.setToken("token-fixo"); 

    console.log("Logado como usuário padrão:", defaultUser);

    // Redireciona
    window.location.href = "../pages/home.html";
  });
});
