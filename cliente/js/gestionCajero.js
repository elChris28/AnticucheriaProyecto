let mesaActualId = null;
let resumenPago = null; // <-- DECLARACIÓN GLOBAL al inicio del archivo

async function cargarMesas() {
  const res = await fetch('/api/mesas');
  const mesas = await res.json();

  const cont = document.getElementById('mesas-container');
  cont.innerHTML = '';

  mesas.forEach(mesa => {
    const btn = document.createElement('button');
    btn.className = `btn btn-${mesa.Estado === 'Ocupado' ? 'danger' : 'success'} fw-bold m-2`;
    btn.textContent = `Mesa ${mesa.Id} - ${mesa.Estado}`;
    btn.onclick = () => cargarDetalleMesa(mesa.Id);
    cont.appendChild(btn);
  });
}

function agruparProductos(productos) {
  const agrupados = {};
  productos.forEach(prod => {
    const key = prod.ProductoId;
    if (!agrupados[key]) {
      agrupados[key] = { ...prod };
    } else {
      agrupados[key].Cantidad += prod.Cantidad;
    }
  });
  return Object.values(agrupados);
}

async function cargarDetalleMesa(mesaId) {
  mesaActualId = mesaId;

  const res = await fetch(`/api/pedidos/mesa/${mesaId}`);
  let platos = await res.json();
  platos = agruparProductos(platos);

  const total = platos.reduce((sum, p) => sum + (p.Precio || 0) * p.Cantidad, 0);

  const cont = document.getElementById('detalle-mesa');
  cont.style.display = 'block';
  cont.innerHTML = `
    <div class="card-body">
      <h5 class="card-title">🧾 Detalle - Mesa ${mesaId}</h5>

      <ul class="list-group list-group-flush mb-3">
        ${platos.map(p => `
          <li class="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <strong>${p.Nombre}</strong><br>
              <button class="btn btn-sm btn-danger" onclick="eliminarPlato(${mesaId}, ${p.ProductoId})">-</button>
              <button class="btn btn-sm btn-success" onclick="agregarPlato(${mesaId}, ${p.ProductoId})">+</button>
            </div>
            <div>S/ ${(p.Precio || 0).toFixed(2)} x ${p.Cantidad}</div>
          </li>
        `).join('')}
      </ul>

      <div class="mb-3">
        <label for="producto-select-${mesaId}" class="form-label">Agregar Plato:</label>
        <div class="input-group">
          <select class="form-select" id="producto-select-${mesaId}"></select>
          <input type="number" id="cantidad-input-${mesaId}" class="form-control" value="1" min="1" style="max-width: 80px;">
          <button class="btn btn-secondary" onclick="agregarPlatoSeleccionado(${mesaId})">Agregar</button>
        </div>
      </div>

      <p class="fw-bold fs-5 text-end">Total: S/ ${total.toFixed(2)}</p>
      <button class="btn btn-primary w-100" onclick="confirmarPago(${mesaId})">Continuar Pago</button>
    </div>
  `;

  const select = document.getElementById(`producto-select-${mesaId}`);
  const resProd = await fetch('/api/productos');
  const productos = await resProd.json();
  select.innerHTML = productos.map(p => `<option value="${p.Id}">${p.Nombre}</option>`).join('');
}

async function agregarPlatoSeleccionado(mesaId) {
  const select = document.getElementById(`producto-select-${mesaId}`);
  const cantidadInput = document.getElementById(`cantidad-input-${mesaId}`);
  const productoId = parseInt(select.value);
  const cantidad = parseInt(cantidadInput.value);

  if (!productoId || cantidad <= 0) {
    alert("Selecciona un producto válido y una cantidad mayor a 0.");
    return;
  }

  const res = await fetch('/api/pedidos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      MesaId: mesaId,
      Productos: [{ ProductoId: productoId, Cantidad: cantidad }]
    })
  });

  if (res.ok) {
    await cargarDetalleMesa(mesaId);
  } else {
    const error = await res.json();
    alert(error.mensaje || 'Error al agregar plato');
  }
}

async function confirmarPago(mesaId) {
  mesaActualId = mesaId;

  const res = await fetch(`/api/pedidos/mesa/${mesaId}`);
  let platos = await res.json();
  platos = agruparProductos(platos);

  const total = platos.reduce((sum, p) => sum + (p.Precio || 0) * p.Cantidad, 0);

  document.getElementById('modal-mesa-id').textContent = mesaId;

  const detalleDiv = document.getElementById('detalle-pago');
  detalleDiv.innerHTML = `
    <ul class="list-group">
      ${platos.map(p => `
        <li class="list-group-item d-flex justify-content-between">
          <span>${p.Nombre} (x${p.Cantidad})</span>
          <span>S/ ${(p.Precio || 0).toFixed(2)}</span>
        </li>
      `).join('')}
      <li class="list-group-item d-flex justify-content-between fw-bold">
        <span>Total:</span>
        <span>S/ ${total.toFixed(2)}</span>
      </li>
    </ul>
  `;

  const modal = new bootstrap.Modal(document.getElementById('modalMetodoPago'));
  modal.show();
}

async function confirmarPagoFinal() {
  const metodo = document.getElementById('metodoPago').value;

  // 1. Confirmar el pago en el backend
  const res = await fetch(`/api/pagos/confirmar/${mesaActualId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metodoPago: metodo })
  });

  const data = await res.json();

  if (res.ok) {
    alert(data.mensaje || 'Pago realizado exitosamente.');

    // ✅ Agrupar platos directamente desde la respuesta del backend
    const productosAgrupados = {};
    for (const p of data.platos || []) {
      const key = p.ProductoId;
      if (!productosAgrupados[key]) {
        productosAgrupados[key] = {
          nombre: p.Nombre, // 👈 ahora sí vendrá del backend
          cantidad: 0,
          precioUnitario: p.Precio
        };
      }
      productosAgrupados[key].cantidad += p.Cantidad;
    }

    // Opcional: si ya incluyes el nombre del producto en `data.platos`, úsalo:
    for (const p of data.platos) {
      if (productosAgrupados[p.ProductoId]) {
        productosAgrupados[p.ProductoId].nombre = p.Nombre || `Producto ${p.ProductoId}`;
      }
    }

    // 🔽 Formatear la lista de platos
    const platosFormateados = Object.values(productosAgrupados);

    // 2. Guardar el resumen en memoria (localStorage si quieres persistencia)
    resumenPago = {
      MesaId: mesaActualId,
      Fecha: new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' }),
      MetodoPago: metodo,
      Platos: platosFormateados,
      Total: data.total
    };

    // ✅ Guardar también en localStorage
    localStorage.setItem('resumenPago', JSON.stringify(resumenPago));

    // 3. Mostrar el resumen y cerrar el modal
    document.getElementById('detalle-mesa').style.display = 'none';
    bootstrap.Modal.getInstance(document.getElementById('modalMetodoPago')).hide();
    await cargarMesas();
    await cargarResumenPago();
  } else {
    alert(data.mensaje || 'Error al confirmar pago.');
  }
}

async function obtenerPlatosPorMesa(mesaId) {
  const res = await fetch(`/api/pedidos/mesa/${mesaId}`);
  const data = await res.json();

  if (!res.ok || !data.productos) return [];

  const productosAgrupados = {};

  for (const p of data.productos) {
    const key = p.Nombre;
    if (!productosAgrupados[key]) {
      productosAgrupados[key] = { cantidad: 0, precio: p.Precio };
    }
    productosAgrupados[key].cantidad += p.Cantidad;
  }

  return Object.entries(productosAgrupados).map(([nombre, info]) =>
    `${nombre} x${info.cantidad} - S/${(info.precio * info.cantidad).toFixed(2)}`
  );
}

async function eliminarPlato(mesaId, productoId) {
  const res = await fetch(`/api/pedidos/${mesaId}/producto/${productoId}`, {
    method: 'DELETE'
  });

  if (res.ok) {
    await cargarDetalleMesa(mesaId);
  } else {
    const error = await res.json();
    alert(error.mensaje || 'Error al eliminar plato');
  }
}

async function agregarPlato(mesaId, productoId) {
  const res = await fetch('/api/pedidos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      MesaId: mesaId,
      Productos: [{ ProductoId: productoId, Cantidad: 1 }]
    })
  });

  if (res.ok) {
    await cargarDetalleMesa(mesaId);
  } else {
    const error = await res.json();
    alert(error.mensaje || 'Error al agregar plato');
  }
}

// Mostrar resumen de pago después del pago o tras recargar
async function cargarResumenPago() {
  let data = null;

  // ⚠️ Si aún no se ha seleccionado ninguna mesa (tras recarga), usar resumenPago de localStorage
  if (!mesaActualId && resumenPago) {
    data = resumenPago;
  } else if (mesaActualId) {
    try {
      const res = await fetch(`/api/pagos/resumen/${mesaActualId}`);
      if (!res.ok) return;
      data = await res.json();
    } catch (error) {
      console.error('Error al cargar resumen de pago:', error);
      return;
    }
  }

  // Si no hay datos, salimos
  if (!data) return;

  // Mostrar en el DOM
  document.getElementById("pago-mesa-id").innerText = data.MesaId;
  document.getElementById("pago-metodo").innerText = data.MetodoPago;
  document.getElementById("pago-total").innerText = `S/ ${data.Total.toFixed(2)}`;

  if (data.Fecha) {
    document.getElementById("pago-fecha").innerText = data.Fecha;
  }

  document.getElementById("resumen-pago").style.display = "block";
}


// OPCIONAL: Imprimir comprobante
function imprimirComprobante() {
  if (!resumenPago) {
    alert("No hay datos de pago para imprimir.");
    return;
  }

  const venta = resumenPago;

  const html = `
    <html>
      <head>
        <title>Boleta de Venta - Mesa ${venta.MesaId}</title>
        <link rel="stylesheet" href="/Admin/css/boleta.css">
      </head>
      <body>
        <div class="boleta-header">
          <img src="/img/LogoAnticucheria.png" alt="Logo">
          <h1>Anticucheria Mechita</h1>
          <p>R.U.C. 10426045881</p>
          <p>Tel: 980824104</p>
          <p>Dir. Pdro. 6 Huascar-SJL</p>
          <p><strong>NOTA DE VENTA</strong></p>
        </div>

        <div class="boleta-info">
          <div><strong>Mesa:</strong> ${venta.MesaId}</div>
          <div><strong>Fecha y Hora:</strong> ${venta.Fecha}</div>
          <div><strong>Método de Pago:</strong> ${venta.MetodoPago}</div>
        </div>

        <table class="boleta-table">
          <thead>
            <tr>
              <th>Cant.</th>
              <th>Descripción</th>
              <th>Precio Unit.</th>
              <th>Importe</th>
            </tr>
          </thead>
          <tbody>
          ${resumenPago.Platos.map(plato => {
            const importe = (plato.precioUnitario * plato.cantidad).toFixed(2);
            return `
              <tr>
                <td>${plato.cantidad}</td>
                <td style="text-align: left;">${plato.nombre}</td>
                <td>S/ ${plato.precioUnitario.toFixed(2)}</td>
                <td><strong>S/ ${importe}</strong></td>
              </tr>`;
          }).join("")}
          </tbody>
        </table>

        <div class="boleta-total">TOTAL: S/ ${venta.Total.toFixed(2)}</div>
        <div class="boleta-footer">¡Gracias por su compra!</div>
        <div class="boleta-footer">Ticket de uso interno de caja</div>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `;

  const win = window.open('', '_blank', 'width=400,height=600');
  if (win) {
    win.document.write(html);
    win.document.close();
  } else {
    alert("Tu navegador bloqueó la ventana emergente. Activa los pop-ups.");
  }
}

// Socket.IO: mesas actualizadas en tiempo real
const socket = io();
socket.on('mesa-actualizada', ({ mesaId, estado }) => {
  console.log(`Mesa ${mesaId} actualizada: ${estado}`);
  cargarMesas();
});

// Al cargar la página
window.addEventListener('load', async () => {
  await cargarMesas();

  const resumenGuardado = localStorage.getItem('resumenPago');
  if (resumenGuardado) {
    resumenPago = JSON.parse(resumenGuardado);
    await cargarResumenPago(); // ✅ Mostrar el resumen recuperado
  }
});
