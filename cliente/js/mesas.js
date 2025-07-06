
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
    div.className = `mesa-item col-6 col-sm-6 col-md-4 col-lg-3 ${claseEstado}`; 
    div.innerHTML = `
      <div class="mesa-info">
        <span onclick="seleccionarMesa(${mesa.Id})">${obtenerNombreMesa(mesa.Numero || mesa.Id)}</span>
      </div>
      <div class="mesa-actions">
        <button class="btn btn-sm btn-danger" onclick="eliminarMesa(${mesa.Id})">Eliminar</button>
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
      body: JSON.stringify({ Estado: 'Libre', Numero: `Mesa ${i + 1}` }) 
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
