
// Carga datos del dashboard 
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/api/dashboard');
    const data = await res.json();

    document.getElementById('total-ventas').textContent = `S/ ${data.totalVentas.toFixed(2)}`;
    document.getElementById('pedidos-activos').textContent = data.pedidosActivos;
    document.getElementById('mesas-ocupadas').textContent = data.mesasOcupadas;
    document.getElementById('total-productos').textContent = data.productos;
    document.getElementById('total-categorias').textContent = data.categorias;

  } catch (err) {
    console.error('Error al cargar dashboard:', err);
  }
});
