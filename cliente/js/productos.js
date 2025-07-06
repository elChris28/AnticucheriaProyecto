
document.addEventListener("DOMContentLoaded", () => {
  cargarProductos();
  cargarCategorias();

  document.getElementById("form-nuevo-producto").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = document.getElementById("nuevo-nombre").value.trim();
    const precio = parseFloat(document.getElementById("nuevo-precio").value);
    const categoriaId = parseInt(document.getElementById("nueva-categoria").value);

    if (!nombre || isNaN(precio)) return alert("Completa los campos correctamente.");

    await fetch("/api/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Nombre: nombre, Precio: precio, CategoriaId: categoriaId }),
    });

    document.getElementById("form-nuevo-producto").reset();
    cargarProductos();
  });
});

function cargarProductos() {
  fetch("/api/productos")
    .then(res => res.json())
    .then(productos => {
      const tabla = document.getElementById("tabla-productos");
      tabla.innerHTML = "";

      const filtroCategoria = document.getElementById("filtro-categoria").value;

      const productosFiltrados = filtroCategoria === "todas"
        ? productos
        : productos.filter(p => p.Categoria === filtroCategoria);

      const productosPorCategoria = {};
      productosFiltrados.forEach(p => {
        if (!productosPorCategoria[p.Categoria]) {
          productosPorCategoria[p.Categoria] = [];
        }
        productosPorCategoria[p.Categoria].push(p);
      });

      for (const categoria in productosPorCategoria) {
        const filaCategoria = document.createElement("tr");
        filaCategoria.innerHTML = `<td colspan="4" class="table-secondary fw-bold">${categoria}</td>`;
        tabla.appendChild(filaCategoria);

        productosPorCategoria[categoria].forEach(producto => {
          const fila = document.createElement("tr");
          fila.innerHTML = `
            <td>${producto.Id}</td>
            <td>${producto.Nombre}</td>
            <td>S/ ${producto.Precio.toFixed(2)}</td>
            <td>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-primary" onclick="editarProducto(${producto.Id}, '${producto.Nombre}', ${producto.Precio})">
                  <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="eliminarProducto(${producto.Id})">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </td>
          `;
          tabla.appendChild(fila);
        });
      }
    });
}

function cargarCategorias() {
  fetch("/api/productos/categorias")
    .then(res => res.json())
    .then(categorias => {
      const select = document.getElementById("nueva-categoria");
      const filtro = document.getElementById("filtro-categoria");

      select.innerHTML = '<option disabled selected>Selecciona una categoría</option>';
      filtro.innerHTML = '<option value="todas">Todas</option>';

      categorias.forEach(cat => {
        const option1 = document.createElement("option");
        option1.value = cat.Id;
        option1.textContent = cat.Nombre;
        select.appendChild(option1);

        const option2 = document.createElement("option");
        option2.value = cat.Nombre;
        option2.textContent = cat.Nombre;
        filtro.appendChild(option2);
      });

      filtro.addEventListener("change", cargarProductos);
    })
    .catch(err => {
      console.error("Error al cargar categorías:", err);
    });
}

function eliminarProducto(id) {
  if (!confirm("¿Seguro que deseas eliminar este producto?")) return;
  fetch(`/api/productos/${id}`, { method: "DELETE" }).then(cargarProductos);
}

function editarProducto(id, nombreActual, precioActual) {
  const nuevoNombre = prompt("Editar nombre:", nombreActual);
  const nuevoPrecio = prompt("Editar precio:", precioActual);
  if (nuevoNombre && nuevoPrecio) {
    fetch(`/api/productos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Nombre: nuevoNombre, Precio: parseFloat(nuevoPrecio) }),
    }).then(cargarProductos);
  }
}
