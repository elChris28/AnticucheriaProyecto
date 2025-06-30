let mesaAEditar = null;
let modalEditar = null;

document.addEventListener('DOMContentLoaded', cargarMesas);

async function cargarMesas() {
  const res = await fetch('/api/mesas');
  const mesas = await res.json();
  const contenedor = document.getElementById('mesas-container');
  contenedor.innerHTML = '';

  mesas.forEach(mesa => {
    const estadoTexto = mesa.Estado === 1 || mesa.Estado === 'Libre' ? 'Libre' : 'Ocupado';
    const claseEstado = estadoTexto === 'Libre' ? 'libre' : 'ocupado';

    const div = document.createElement('div');
    div.className = `mesa col-md-2 ${claseEstado}`;
    div.innerHTML = `
      <div onclick="seleccionarMesa(${mesa.Id})">${obtenerNombreMesa(mesa.Numero || mesa.Id)}</div>
      <div class="mt-2">
        <button class="btn btn-sm btn-light" onclick="editarMesa(${mesa.Id})">Editar</button>
        <button class="btn btn-sm btn-dark" onclick="eliminarMesa(${mesa.Id})">Eliminar</button>
      </div>
    `;
    contenedor.appendChild(div);
  });
}

async function agregarVariasMesas() {
  const cantidad = parseInt(document.getElementById('cantidadMesas').value);
  if (!cantidad || cantidad <= 0) {
    alert('Ingresa una cantidad válida.');
    return;
  }

  for (let i = 0; i < cantidad; i++) {
    await fetch('/api/mesas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Estado: 'Libre', Numero: `Mesa ${i + 1}` }) // asegúrate que tu backend lo acepte como string
    });
  }

  cargarMesas();
}


async function eliminarMesa(id) {
  if (confirm('¿Estás seguro de eliminar esta mesa?')) {
    await fetch(`/api/mesas/${id}`, { method: 'DELETE' });
    cargarMesas();
  }
}


function obtenerNombreMesa(numero) {
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
    10: 'Mesa LLevar',
    11: 'Mesa LLevar',
    12: 'Mesa LLevar',
    13: 'Mesa LLevar',
    14: 'Mesa LLevar',
    15: 'Mesa LLevar',
    16: 'Mesa LLevar',
    // Puedes seguir agregando más nombres según lo necesites
  };

  return nombres[numero] || `Mesa ${numero}`;
}
