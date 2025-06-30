document.addEventListener('DOMContentLoaded', cargarVentas);

async function cargarVentas() {
  try {
    const res = await fetch('/api/reportes');
    const ventas = await res.json();

    const tbody = document.querySelector('#tabla-ventas tbody');
    tbody.innerHTML = '';

    if (ventas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay ventas</td></tr>';
      return;
    }

    console.log('📦 Respuesta recibida:', ventas);

    if (!Array.isArray(ventas)) {
      console.error('❌ No es un array:', ventas);
      return;
    }

    ventas.forEach(v => {
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td style="display:none">${v.IdVenta}</td>
        <td>${v.NumeroMesa}</td>
        <td>S/ ${v.Total.toFixed(2)}</td>
        <td>${ajustarZonaHoraria(v.Fecha)}</td>
        <td>
          ${v.MetodoPago}
          <button class="btn btn-warning btn-sm ms-2 editar-btn" data-id="${v.IdVenta}" data-metodo="${v.MetodoPago}">
            Editar
          </button>
        </td>
        <td>
          <button class="btn btn-danger btn-sm eliminar-btn" data-id="${v.IdVenta}">Eliminar</button>
        </td>
      `;
      tbody.appendChild(fila);
    })

    // ✅ Agregar eventos a los botones eliminar
    document.querySelectorAll('.eliminar-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        eliminarVenta(id);
      });
    });

    // ✅ Agregar eventos a los botones editar
    document.querySelectorAll('.editar-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const metodoActual = btn.getAttribute('data-metodo');
        editarMetodo(id, metodoActual);
      });
    });

  } catch (err) {
    console.error('❌ Error al cargar ventas:', err);
  }
}

async function eliminarVenta(id) {
  if (!confirm('¿Estás seguro de eliminar esta venta?')) return;

  try {
    const res = await fetch(`/api/reportes/${id}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      alert('✅ Venta eliminada');
      cargarVentas();
    } else {
      alert('❌ Error al eliminar venta');
    }
  } catch (err) {
    console.error('❌ Error en eliminación:', err);
  }
}

async function editarMetodo(id, metodoActual) {
  const opciones = ['Efectivo', 'Yape', 'Plin', 'Tarjeta'];

  const select = document.createElement('select');
  select.className = 'form-select form-select-sm';
  opciones.forEach(opcion => {
    const option = document.createElement('option');
    option.value = opcion;
    option.textContent = opcion;
    if (opcion === metodoActual) option.selected = true;
    select.appendChild(option);
  });

  const celda = document.querySelector(`button[data-id="${id}"]`).closest('td');
  celda.innerHTML = ''; // Limpiar celda actual
  celda.appendChild(select);

  select.addEventListener('change', async () => {
    const nuevoMetodo = select.value;
    try {
      const res = await fetch(`/api/reportes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metodoPago: nuevoMetodo })
      });

      if (res.ok) {
        alert('✅ Método de pago actualizado');
        cargarVentas(); // Recargar datos actualizados
      } else {
        alert('❌ Error al actualizar método');
      }
    } catch (err) {
      console.error('❌ Error en edición:', err);
    }
  });
}

function ajustarZonaHoraria(fechaISO) {
  const fecha = new Date(fechaISO);

  fecha.setHours(fecha.getHours() + 5);
  return fecha.toLocaleString('es-PE');
}
