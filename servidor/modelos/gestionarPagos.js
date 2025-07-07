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

async function confirmarPago(mesaId, metodoPago) {
  try {
    const productos = await db.executeQueryWithNamedParams(`
      SELECT dp.ProductoId, dp.Cantidad, p.Precio, p.Nombre
      FROM Pedidos pe
      JOIN DetallePedido dp ON dp.PedidoId = pe.Id
      JOIN Productos p ON p.Id = dp.ProductoId
      WHERE pe.MesaId = @MesaId AND pe.Estado != 'Pagado';
    `, { MesaId: mesaId });

    if (productos.length === 0) {
      throw new Error('No hay productos para esta mesa');
    }

    const total = productos.reduce((sum, p) => sum + p.Precio * p.Cantidad, 0);

    await db.executeQueryWithNamedParams(`
      INSERT INTO Ventas (MesaId, Total, MetodoPago, Fecha)
      VALUES (@MesaId, @Total, @MetodoPago, SWITCHOFFSET(SYSDATETIMEOFFSET(), '-05:00'));
    `, { MesaId: mesaId, Total: total, MetodoPago: metodoPago });

    const ventaResult = await db.executeQueryWithNamedParams(`
      SELECT TOP 1 Id FROM Ventas WHERE MesaId = @MesaId ORDER BY Fecha DESC;
    `, { MesaId: mesaId });

    const ventaId = ventaResult[0].Id;

    for (const p of productos) {
      await db.executeQueryWithNamedParams(`
        INSERT INTO DetalleVenta (VentaId, ProductoId, Cantidad, PrecioUnitario)
        VALUES (@VentaId, @ProductoId, @Cantidad, @PrecioUnitario);
      `, {
        VentaId: ventaId,
        ProductoId: p.ProductoId,
        Cantidad: p.Cantidad,
        PrecioUnitario: p.Precio
      });
    }

    await db.executeQueryWithNamedParams(`
      DELETE FROM DetallePedido 
      WHERE PedidoId IN (SELECT Id FROM Pedidos WHERE MesaId = @MesaId AND Estado != 'Pagado');
    `, { MesaId: mesaId });

    await db.executeQueryWithNamedParams(`
      DELETE FROM Pedidos WHERE MesaId = @MesaId AND Estado != 'Pagado';
    `, { MesaId: mesaId });

    await db.executeQueryWithNamedParams(`
      UPDATE Mesas SET Estado = 'Libre' WHERE Id = @MesaId;
    `, { MesaId: mesaId });

    return { total, productos, metodoPago };
  } catch (err) {
    throw new Error('Error al confirmar el pago');
  }
}

async function obtenerResumenPago(mesaId) {
  try {
    const query = `
      SELECT TOP 1 
        MesaId, 
        Total, 
        MetodoPago, 
        CONVERT(varchar, Fecha, 120) AS Fecha
      FROM Ventas
      WHERE MesaId = @param0
      ORDER BY Fecha DESC
    `;

    const rows = await db.executeQuery(query, [mesaId]);

    if (rows.length === 0) {
      throw new Error('No se encontró el resumen para esta mesa');
    }

    return rows[0];
  } catch (error) {
    throw new Error('Error al obtener resumen de pago');
  }
}

module.exports = {
  obtenerVentas,
  eliminarVenta,
  editarVenta,
  confirmarPago,
  obtenerResumenPago
};
