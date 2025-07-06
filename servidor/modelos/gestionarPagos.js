const db = require('../config/db');

async function obtenerVentas() {
  try {
    const ventas = await db.executeQuery(`
      SELECT v.id AS IdVenta, v.MetodoPago, v.Total, v.Fecha, m.id AS NumeroMesa
      FROM Ventas v
      JOIN Mesas m ON v.MesaId = m.id
      ORDER BY v.Fecha DESC
    `);
    return ventas;
  } catch (err) {
    throw new Error('Error al obtener ventas');
  }
}

async function eliminarVenta(id) {
  try {
    await db.executeNonQuery('DELETE FROM DetalleVenta WHERE VentaId = @param0', [id]);
    await db.executeNonQuery('DELETE FROM Ventas WHERE id = @param0', [id]);
    return { success: true };
  } catch (err) {
    throw new Error('Error al eliminar venta');
  }
}

async function editarVenta(id, metodoPago) {
  try {
    await db.executeNonQuery('UPDATE Ventas SET MetodoPago = @param0 WHERE Id = @param1', [metodoPago, id]);
    return { success: true };
  } catch (err) {
    throw new Error('Error al editar venta');
  }
}

module.exports = {
  obtenerVentas,
  eliminarVenta,
  editarVenta
};
