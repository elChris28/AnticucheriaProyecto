let mesaSeleccionada = null;
let productosSeleccionados = [];
let productosAsignados = [];

document.addEventListener('DOMContentLoaded', async () => {
  await cargarMesas();
});

async function cargarMesas() {
  const res = await fetch('/api/mesas');
  const mesas = await res.json();
  const container = document.getElementById('mesas-container');
  container.innerHTML = '';

  mesas.forEach(mesa => {
    const color = mesa.Estado === 'Ocupado' ? 'red' : 'green';
    const div = document.createElement('div');
    div.className = 'col-md-3';
    div.innerHTML = `
      <button class="btn" style="width: 100%; height: 70px; background-color: ${color}; color: white; margin-bottom: 10px;" onclick="abrirModalProductos(${mesa.Id})">
        ${obtenerNombreMesa(mesa.Id)} - ${mesa.Estado}
      </button>`;
    container.appendChild(div);
  });
}

async function abrirModalProductos(idMesa) {
  mesaSeleccionada = idMesa;
  productosSeleccionados = [];

  document.getElementById('mesa-id-title').textContent = idMesa;

  const resAsignados = await fetch(`/api/pedidos/mesa/${idMesa}`);
  productosAsignados = await resAsignados.json();

  await renderizarSeleccionados();

  const resCategorias = await fetch('/api/productos/categorias-con-productos');
  const categorias = await resCategorias.json();
  const contenedor = document.getElementById('productosPorCategoria');
  contenedor.innerHTML = '';

  categorias.forEach(cat => {
    const seccion = document.createElement('div');
    seccion.innerHTML = `
      <h6>${cat.Nombre}</h6>
      <div class="d-flex flex-wrap gap-2 mb-3">
        ${cat.Productos.map(p => `
          <button class="btn btn-secondary" onclick="agregarProducto(${p.Id}, '${p.Nombre.replace(/'/g, "\\'")}')">${p.Nombre}</button>
        `).join('')}
      </div>
    `;
    contenedor.appendChild(seccion);
  });

  const modal = new bootstrap.Modal(document.getElementById('modalProductos'));
  modal.show();
}

function agregarProducto(productoId, nombre) {
  const existente = productosSeleccionados.find(p => p.ProductoId === productoId);
  if (existente) {
    existente.Cantidad += 1;
  } else {
    productosSeleccionados.push({ ProductoId: productoId, Nombre: nombre, Cantidad: 1 });
  }
  renderizarSeleccionados();
}

async function renderizarSeleccionados() {
  const contenedor = document.getElementById('platosAsignados');
  contenedor.innerHTML = '';

  // Productos ya enviados
  productosAsignados.forEach((p, index) => {
    const div = document.createElement('div');
    div.className = 'd-flex align-items-center justify-content-between mb-2 border p-2 rounded';
    div.innerHTML = `
      <span><strong>${p.Nombre}</strong> (x<span id="cantidad-${index}">${p.Cantidad}</span>)</span>
      <div>
        <button class="btn btn-sm btn-secondary me-1" onclick="modificarCantidad(${index}, 1)">+</button>
        <button class="btn btn-sm btn-secondary me-1" onclick="modificarCantidad(${index}, -1)">-</button>
        <button class="btn btn-sm btn-danger me-1" onclick="eliminarPlato(${index})">🗑</button>
        <button class="btn btn-sm btn-success" onclick="enviarPlato(${index})">📤</button>
      </div>
    `;
    contenedor.appendChild(div);
  });

  // Productos aún no enviados
productosSeleccionados.forEach((p, index) => {
  const div = document.createElement('div');
  div.className = 'd-flex align-items-center justify-content-between mb-2 border p-2 rounded bg-light';

  div.innerHTML = `
    <div>
      <strong>${p.Nombre}</strong> (x<span id="cantidad-nuevo-${index}">${p.Cantidad}</span>)
      <span class="badge bg-warning text-dark ms-2">Producto nuevo</span>
    </div>
    <div>
      <button class="btn btn-sm btn-secondary me-1" onclick="modificarCantidadNuevo(${index}, 1)">+</button>
      <button class="btn btn-sm btn-secondary me-1" onclick="modificarCantidadNuevo(${index}, -1)">-</button>
      <button class="btn btn-sm btn-danger me-1" onclick="eliminarSeleccionado(${index})">🗑</button>
      <button class="btn btn-sm btn-success" onclick="enviarProductoSeleccionado(${index})">📤</button>
    </div>
  `;
  contenedor.appendChild(div);
});
}

function modificarCantidad(index, delta) {
  const producto = productosAsignados[index];
  producto.Cantidad = Math.max(1, producto.Cantidad + delta);
  document.getElementById(`cantidad-${index}`).textContent = producto.Cantidad;
}

function modificarCantidadNuevo(index, delta) {
  const producto = productosSeleccionados[index];
  producto.Cantidad = Math.max(1, producto.Cantidad + delta);
  document.getElementById(`cantidad-nuevo-${index}`).textContent = producto.Cantidad;
}

function eliminarSeleccionado(index) {
  productosSeleccionados.splice(index, 1);
  renderizarSeleccionados();
}

function eliminarPlato(index) {
  if (!confirm('¿Eliminar este plato del pedido?')) return;

  const producto = productosAsignados[index];

  fetch(`/api/pedidos/${mesaSeleccionada}/producto/${producto.ProductoId}`, {
    method: 'DELETE'
  }).then(async res => {
    if (res.ok) {
      alert('Producto eliminado');
      const modal = bootstrap.Modal.getInstance(document.getElementById('modalProductos'));
      modal.hide();
      setTimeout(async () => {
        await abrirModalProductos(mesaSeleccionada);
        await cargarMesas();
      }, 400);
    } else {
      alert('Error al eliminar producto');
    }
  });
}

function enviarPlato(index) {
  const producto = productosAsignados[index];

  fetch('/api/pedidos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      MesaId: mesaSeleccionada,
      Productos: [{
        ProductoId: producto.ProductoId ?? producto.Id,
        Cantidad: producto.Cantidad || 1
      }]
    })
  }).then(async res => {
    if (res.ok) {
      alert('Plato enviado correctamente');
      const modal = bootstrap.Modal.getInstance(document.getElementById('modalProductos'));
      modal.hide();
      setTimeout(async () => {
        await abrirModalProductos(mesaSeleccionada);
        await cargarMesas();
      }, 400);
    } else {
      alert('Error al enviar plato');
    }
  });
}

async function confirmarPedido() {
  if (productosSeleccionados.length === 0) {
    alert('Debes agregar al menos un producto.');
    return;
  }

  const pedido = {
    MesaId: mesaSeleccionada,
    Productos: productosSeleccionados
  };

  const res = await fetch('/api/pedidos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pedido)
  });

  if (res.ok) {
    alert('Pedido registrado correctamente.');
    await fetch(`/api/mesas/${mesaSeleccionada}/estado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Estado: 'Ocupado' })
    });

    bootstrap.Modal.getInstance(document.getElementById('modalProductos')).hide();
    await cargarMesas();
  } else {
    alert('Error al registrar el pedido.');
  }
}

function enviarProductoSeleccionado(index) {
  const producto = productosSeleccionados[index];

  fetch('/api/pedidos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      MesaId: mesaSeleccionada,
      Productos: [{
        ProductoId: producto.ProductoId,
        Cantidad: producto.Cantidad
      }]
    })
  }).then(async res => {
    if (res.ok) {
      alert(`Plato "${producto.Nombre}" enviado correctamente`);

      // Eliminamos de la lista de seleccionados
      productosSeleccionados.splice(index, 1);

      const modal = bootstrap.Modal.getInstance(document.getElementById('modalProductos'));
      modal.hide();

      setTimeout(async () => {
        await abrirModalProductos(mesaSeleccionada);
        await cargarMesas();
      }, 400);
    } else {
      alert('Error al enviar el producto');
    }
  });
}

function obtenerNombreMesa(numero) {

  if (numero >= 10) {
    return 'Mesa Llevar';
  }

  const nombres = {
    1: 'Mesa 1',
    2: 'Mesa 2',
    3: 'Mesa 3',
    4: 'Mesa 4',
    5: 'Mesa 5',
    6: 'Mesa 6',
    7: 'Mesa 7',
    8: 'Mesa 8',
    9: 'Mesa 9',
  };

  return nombres[numero] || `Mesa ${numero}`;
}

const socket = io(); 

socket.on('mesa-actualizada', ({ mesaId, estado }) => {
  console.log(`[Socket] Mesa ${mesaId} actualizada a ${estado}`);
  cargarMesas(); 
});
