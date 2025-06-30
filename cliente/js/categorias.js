
document.addEventListener("DOMContentLoaded", () => {
  cargarCategorias();

  document.getElementById("form-nueva-categoria").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = document.getElementById("nombre-categoria").value.trim();

    if (!nombre) return alert("Ingresa un nombre de categoría válido.");

    await fetch("/api/productos/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Nombre: nombre }),
    });

    document.getElementById("form-nueva-categoria").reset();
    cargarCategorias();
  });
});

function cargarCategorias() {
  fetch("/api/productos/categorias")
    .then(res => res.json())
    .then(categorias => {
      const tabla = document.getElementById("tabla-categorias");
      tabla.innerHTML = "";

      categorias.forEach(cat => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
          <td>${cat.Id}</td>
          <td>${cat.Nombre}</td>
          <td>
            <button class="btn btn-sm btn-primary me-2" onclick="editarCategoria(${cat.Id}, '${cat.Nombre}')">
              <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="eliminarCategoria(${cat.Id})">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        `;
        tabla.appendChild(fila);
      });
    });
}

function editarCategoria(id, nombreActual) {
  const nuevoNombre = prompt("Editar nombre de la categoría:", nombreActual);
  if (nuevoNombre && nuevoNombre.trim()) {
    fetch(`/api/productos/categorias/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Nombre: nuevoNombre }),
    }).then(cargarCategorias);
  }
}

function eliminarCategoria(id) {
  if (!confirm("¿Seguro que deseas eliminar esta categoría?")) return;
  fetch(`/api/productos/categorias/${id}`, { method: "DELETE" })
    .then(cargarCategorias);
}
