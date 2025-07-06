const db = require('../config/db');

// Función para registrar un pedido
async function registrarPedido(MesaId, Productos) {
  const fecha = new Date().toISOString();
  try {
    // Crear pedido
    const pedidoInsert = await db.executeQueryWithNamedParams(
      'INSERT INTO Pedidos (MesaId, Fecha, Estado) OUTPUT INSERTED.Id VALUES (@MesaId, @Fecha, @Estado)',
      { MesaId, Fecha: fecha, Estado: 'Pendiente' }
    );
    const pedidoId = pedidoInsert[0].Id;

    // Insertar detalles del pedido
    for (const item of Productos) {
      await db.executeQueryWithNamedParams(
        'INSERT INTO DetallePedido (PedidoId, ProductoId, Cantidad, Estado) VALUES (@PedidoId, @ProductoId, @Cantidad, @Estado)',
        { PedidoId: pedidoId, ProductoId: item.ProductoId, Cantidad: item.Cantidad || 1, Estado: 'Pendiente' }
      );
    }

    // Actualizar estado de la mesa
    await db.executeQueryWithNamedParams(
      'UPDATE Mesas SET Estado = \'Ocupado\' WHERE Id = @MesaId',
      { MesaId }
    );

    return { pedidoId, mensaje: 'Pedido creado y mesa marcada como Ocupada' };
  } catch (err) {
    console.error(err);
    throw new Error('Error al registrar pedido');
  }
}

// Función para obtener los productos pendientes de una mesa
async function obtenerProductosPendientesDeMesa(mesaId) {
  try {
    const query = `
      SELECT 
        p.Nombre, 
        dp.Cantidad, 
        p.Id AS ProductoId,
        p.Precio
      FROM DetallePedido dp
      JOIN Productos p ON dp.ProductoId = p.Id
      JOIN Pedidos pe ON dp.PedidoId = pe.Id
      WHERE pe.MesaId = @MesaId AND pe.Estado != 'Pagado'
    `;
    const productos = await db.executeQueryWithNamedParams(query, { MesaId: mesaId });
    return productos;
  } catch (error) {
    console.error('Error al obtener productos de la mesa:', error);
    throw new Error('Error al obtener productos');
  }
}

// Función para eliminar un producto del pedido activo
async function eliminarProductoDelPedido(mesaId, productoId) {
  try {
    const pedidoConProducto = await db.executeQueryWithNamedParams(
      `
      SELECT TOP 1 dp.PedidoId
      FROM DetallePedido dp
      JOIN Pedidos p ON dp.PedidoId = p.Id
      WHERE p.MesaId = @MesaId AND p.Estado != 'Pagado' AND dp.ProductoId = @ProductoId
      `,
      { MesaId: mesaId, ProductoId: productoId }
    );

    if (pedidoConProducto.length === 0) {
      throw new Error('Producto no encontrado en pedidos activos');
    }

    const pedidoId = pedidoConProducto[0].PedidoId;

    await db.executeQueryWithNamedParams(
      'DELETE FROM DetallePedido WHERE PedidoId = @PedidoId AND ProductoId = @ProductoId',
      { PedidoId: pedidoId, ProductoId: productoId }
    );

    const productosRestantes = await db.executeQueryWithNamedParams(
      'SELECT COUNT(*) AS total FROM DetallePedido WHERE PedidoId = @PedidoId',
      { PedidoId: pedidoId }
    );

    if (productosRestantes[0].total === 0) {
      await db.executeQueryWithNamedParams(
        'DELETE FROM Pedidos WHERE Id = @PedidoId',
        { PedidoId: pedidoId }
      );

      const pedidosRestantes = await db.executeQueryWithNamedParams(
        'SELECT COUNT(*) AS total FROM Pedidos WHERE MesaId = @MesaId AND Estado != \'Pagado\'',
        { MesaId: mesaId }
      );

      if (pedidosRestantes[0].total === 0) {
        await db.executeQueryWithNamedParams(
          'UPDATE Mesas SET Estado = \'Libre\' WHERE Id = @MesaId',
          { MesaId: mesaId }
        );
      }
    }

    return { mensaje: 'Producto eliminado correctamente' };
  } catch (error) {
    console.error('Error al eliminar producto del pedido:', error);
    throw new Error('Error en servidor');
  }
}


module.exports = {
  registrarPedido,
  obtenerProductosPendientesDeMesa,
  eliminarProductoDelPedido
};
