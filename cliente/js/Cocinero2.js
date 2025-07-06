const socket = io();
const rolCocinero = "cocinero_2";
let platosAsignados = [];
let platosTerminados = [];

socket.emit("rolCocinero", rolCocinero);

// Escuchar platos listos desde el servidor
socket.on("pedidosListos", (lista) => {
  platosTerminados = lista.map(p => ({
    plato: p.platos.map(pp => `${pp.nombre} x${pp.cantidad}`).join(', '),
    mesaId: p.mesaId,
    hora: p.fechaHora
  }));
  renderPlatosTerminados();
});

// Cargar los platos pendientes para el cocinero jean
async function cargarPlatos() {
  try {
    const res = await fetch('/api/pedidos/pendientes/cocinero/Jean');
    const data = await res.json();

    const ahora = Date.now();

    platosAsignados = data.map(p => {
      const existente = platosAsignados.find(x => x.Plato === p.Plato && x.MesaId === p.MesaId);
      return {
        ...p,
        startTime: existente?.startTime || ahora
      };
    });
    renderPlatos();
  } catch (err) {
    console.error("Error al cargar platos:", err);
  }
}

// Mostrar los platos pendientes 
function renderPlatos() {
  const contenedor = document.getElementById('lista-platos');
  contenedor.innerHTML = '';

  if (platosAsignados.length === 0) {
    contenedor.innerHTML = '<p class="text-muted">No hay platos pendientes.</p>';
    return;
  }

  platosAsignados.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card mb-3 shadow-sm';

    const horaIngreso = new Date(p.HoraIngreso.replace(' ', 'T'));
    const tiempoLimiteMs = 30 * 60 * 1000; 
    const tiempoRestanteMs = tiempoLimiteMs - (Date.now() - horaIngreso.getTime());

    card.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <div class="titulo">${p.Plato}</div>
            <div class="text-muted">Categoría: ${p.Categoria}</div>
            <div>Mesa: <strong>${p.MesaId}</strong> - Cantidad: ${p.Cantidad}</div>
            <div>Tiempo: <span id="temporizador-${p.DetalleId}" class="badge bg-success">--:--</span></div>
          </div>
          <button class="btn btn-success btn-sm" onclick="marcarListo('${p.Plato}', ${p.MesaId}, ${p.Cantidad})">✅ Listo</button>
        </div>
      </div>
    `;

    contenedor.appendChild(card);

    iniciarTemporizador(`temporizador-${p.DetalleId}`, horaIngreso);
  });
}

function iniciarTemporizador(elementId, horaInicio) {
  const span = document.getElementById(elementId);
  const tiempoMax = 30 * 60 * 1000;

  function actualizar() {
    const ahora = new Date();
    const transcurrido = ahora - new Date(horaInicio);
    const restante = tiempoMax - transcurrido;

    let color = 'bg-success';
    let texto = '';

    if (restante >= 0) {
      const min = Math.floor(restante / 60000);
      const seg = Math.floor((restante % 60000) / 1000);
      texto = `${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`;

      if (restante <= 5 * 60 * 1000) {
        color = 'bg-danger';
      } else if (restante <= 15 * 60 * 1000) {
        color = 'bg-warning text-dark';
      }
    } else {
      const extra = -restante;
      const min = Math.floor(extra / 60000);
      const seg = Math.floor((extra % 60000) / 1000);
      texto = `+${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`;
      color = 'bg-dark';
    }

    span.className = `badge ${color}`;
    span.innerText = texto;
  }

  actualizar();
  setInterval(actualizar, 1000);
}

function formatearTiempo(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const sec = String(totalSec % 60).padStart(2, '0');
  return `${min}:${sec}`;
}

async function marcarListo(plato, mesaId, cantidad) {
  const confirmar = await Swal.fire({
    title: `¿Marcar "${plato}" como listo?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, listo',
    cancelButtonText: 'Cancelar'
  });

  if (confirmar.isConfirmed) {
    await fetch('/api/pedidos/marcar-listo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plato, mesaId })
    });

    socket.emit("pedidoListo", {
      pedidoId: null,
      cocinero: rolCocinero,
      mesaId,
      platos: [{ nombre: plato, cantidad }]
    });

    platosTerminados.unshift({
      plato: `${plato} x${cantidad}`,
      mesaId,
      hora: new Date().toLocaleTimeString()
    });

    renderPlatosTerminados();
    Swal.fire('Plato marcado como listo', '', 'success');
  }
}

// Mostrar platos terminados
function renderPlatosTerminados() {
  const contenedor = document.getElementById('platos-terminados');
  contenedor.innerHTML = '';

  platosTerminados.slice().reverse().forEach((p, i) => {
    const index = platosTerminados.length - 1 - i;
    const card = document.createElement('div');
    card.className = 'card terminado-card mb-2 shadow-sm';
    card.innerHTML = `
      <div class="card-body d-flex justify-content-between align-items-center">
        <div>
          <strong>${p.plato}</strong> - Mesa ${p.mesaId}
          <div class="text-muted small">Hora: ${p.hora}</div>
        </div>
        <div>
          <span class="text-success fs-4 me-2">✔️</span>
          <button class="btn btn-outline-danger btn-sm" onclick="eliminarPlatoTerminado(${index})">🗑</button>
        </div>
      </div>
    `;
    contenedor.appendChild(card);
  });
}

function eliminarPlatoTerminado(index) {
  socket.emit("eliminarPedidoListo", { index, cocinero: rolCocinero });
}

function eliminarTodosPedidosListos() {
  socket.emit("eliminarTodosPedidosListos", rolCocinero);
}

cargarPlatos();
setInterval(cargarPlatos, 5000);
