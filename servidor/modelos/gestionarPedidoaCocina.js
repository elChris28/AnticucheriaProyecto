const db = require('../config/db');


async function obtenerPlatosPendientesCocinero(cocinero) {
  try {
    await db.executeQueryWithNamedParams(`
      UPDATE DetallePedido
      SET HoraIngreso = DATEADD(HOUR, -5, GETDATE())
      WHERE Estado = 'pendiente' 
        AND HoraIngreso IS NULL 
        AND ProductoId IN (
          SELECT p.Id
          FROM Productos p
          JOIN AsignacionCategoriasCocinero ac ON ac.CategoriaId = p.CategoriaId
          WHERE ac.CocineroNombre = @cocinero
        )
    `, { cocinero });

    const result = await db.executeQueryWithNamedParams(`
      SELECT 
        dp.Id as DetalleId, 
        dp.ProductoId, 
        dp.PedidoId, 
        dp.Cantidad, 
        FORMAT(dp.HoraIngreso, 'yyyy-MM-dd HH:mm:ss') AS HoraIngreso,
        p.Nombre AS Plato, 
        c.Nombre AS Categoria, 
        pe.MesaId
      FROM DetallePedido dp
      JOIN Productos p ON p.Id = dp.ProductoId
      JOIN Categorias c ON c.Id = p.CategoriaId
      JOIN Pedidos pe ON pe.Id = dp.PedidoId
      JOIN AsignacionCategoriasCocinero ac ON ac.CategoriaId = p.CategoriaId
      WHERE dp.Estado = 'pendiente' 
        AND ac.CocineroNombre = @cocinero
    `, { cocinero });

    return result;
  } catch (error) {
    console.error('Error al obtener pendientes del cocinero:', error);
    throw new Error('Error en el servidor');
  }
}

async function obtenerMesas() {
  try {
    const mesas = await db.executeQuery('SELECT * FROM Mesas');
    return mesas;
  } catch (error) {
    console.error('Error al obtener mesas:', error);
    throw new Error('Error al obtener mesas');
  }
}

async function marcarPlatoListo(plato, mesaId) {
  try {
    const pedido = await db.executeQueryWithNamedParams(
      'SELECT TOP 1 Id FROM Pedidos WHERE MesaId = @MesaId AND Estado = \'Pendiente\' ORDER BY Fecha DESC',
      { MesaId: mesaId }
    );

    if (pedido.length === 0) {
      throw new Error('Pedido no encontrado');
    }

    const pedidoId = pedido[0].Id;

    await db.executeQueryWithNamedParams(
      `UPDATE DetallePedido 
        SET Estado = 'Listo' 
        WHERE PedidoId = @PedidoId AND ProductoId IN 
        (SELECT Id FROM Productos WHERE Nombre = @Nombre)`,
      { PedidoId: pedidoId, Nombre: plato }
    );

    return { mensaje: 'Plato marcado como listo' };
  } catch (err) {
    console.error('Error al marcar plato como listo:', err);
    throw new Error('Error interno');
  }
}

module.exports = {
  obtenerPlatosPendientesCocinero,
  obtenerMesas,
  marcarPlatoListo
};