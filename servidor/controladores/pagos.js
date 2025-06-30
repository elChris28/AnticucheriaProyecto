const express = require('express');
const router = express.Router();
const db = require('../config/db'); 

// Confirmar el pago de una mesa
router.post('/confirmar/:mesaId', async (req, res) => {
  const mesaId = parseInt(req.params.mesaId);
  const metodoPago = req.body.metodoPago || 'Efectivo'; 

  try {
    const productos = await db.executeQueryWithNamedParams(`
      SELECT dp.ProductoId, dp.Cantidad, p.Precio, p.Nombre
      FROM Pedidos pe
      JOIN DetallePedido dp ON dp.PedidoId = pe.Id
      JOIN Productos p ON p.Id = dp.ProductoId
      WHERE pe.MesaId = @MesaId AND pe.Estado != 'Pagado';
    `, { MesaId: mesaId });

    if (productos.length === 0) {
      return res.status(400).json({ error: 'No hay productos para esta mesa.' });
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

    //actualizar en tiempo real
    req.io.emit('mesa-actualizada', { mesaId: mesaId, estado: 'Libre' });

    res.json({
      ok: true,
      total, 
      platos: productos, 
      metodoPago: metodoPago,
      mensaje: `Pago confirmado con ${metodoPago} y mesa liberada`
    });

  } catch (err) {
    console.error('Error al confirmar pago:', err);
    res.status(500).json({ error: 'Error al confirmar pago' });
  }
});

//RESUMEN PAGO
router.get('/resumen/:mesaId', async (req, res) => {
  const mesaId = req.params.mesaId;

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
      return res.status(404).json({ mensaje: 'No se encontró el resumen para esta mesa' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener resumen de pago:", error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});


module.exports = router;
