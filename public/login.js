document.getElementById("login-form").addEventListener("submit", function (e) {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  // Definir los roles y contraseñas correspondientes
  const users = {
    Admin: { password: "1234", role: "mesas", redirect: "gestionMesas.html" },
    Admin_categorias: { password: "5678", role: "categorias", redirect: "gestionCategorias.html" },
    cocinero_1: { password: "abcd", role: "cocinero_1", redirect: "gestionCocina1.html" },
    Cocinero_2: { password: "efgh", role: "cocinero_2", redirect: "gestionCocina2.html" },
    Cajero: { password: "1a2b", role: "cajero", redirect: "gestionCajero.html" },
    Control: { password: "1a2b", role: "control", redirect: "Admin/Inicio.html" }
  };

  // Verificar si el usuario ingresado existe
  if (users[username] && users[username].password === password) {
    localStorage.setItem("userRole", users[username].role);
    window.location.href = users[username].redirect;
  } else {
    const errorMessage = document.getElementById("error-message");
    errorMessage.textContent = "Usuario o contraseña incorrectos";
    errorMessage.classList.remove("hidden");
    setTimeout(() => errorMessage.classList.add("hidden"), 3000);
  }
});
