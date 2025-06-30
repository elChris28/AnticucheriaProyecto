document.getElementById("login-form").addEventListener("submit", function (e) {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  // Definir los roles y contraseñas correspondientes
  const users = {
    Mesas: { password: "1a2b", role: "mesas", redirect: "View/gestionMesas.html" },
    Cocinero_1: { password: "1a2b", role: "cocinero_1", redirect: "View/Cocinero1.html" },
    Cocinero_2: { password: "1a2b", role: "cocinero_2", redirect: "View/Cocinero2.html" },
    Cajero: { password: "1a2b", role: "cajero", redirect: "View/gestionCajero.html" },
    Control: { password: "1a2b", role: "control", redirect: "paginas/inicio.html" }
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
