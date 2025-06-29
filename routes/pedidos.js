const express = require('express');
const router = express.Router();
const db = require('../db');

// Registrar pedido y marcar mesa como "Ocupado"
router.post('/', async (req, res) => {
  const { MesaId, Productos } = req.body;
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

    // ✅ Cambiar estado de la mesa a 'Ocupado'
    await db.executeQueryWithNamedParams(
      'UPDATE Mesas SET Estado = \'Ocupado\' WHERE Id = @MesaId',
      { MesaId }
    );

    // Emitir a todos los clientes que esa mesa cambió de estado
    req.io.emit('mesa-actualizada', { mesaId: MesaId, estado: 'Ocupado' });

    res.status(201).json({ mensaje: 'Pedido creado y mesa marcada como Ocupada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al registrar pedido' });
  }
});

// Obtener productos asignados a la mesa (con ProductoId incluido)
router.get('/mesa/:mesaId', async (req, res) => {
  const mesaId = parseInt(req.params.mesaId);
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
    res.json(productos);
  } catch (error) {
    console.error('❌ Error al obtener productos de la mesa:', error);
    res.status(500).json({ mensaje: 'Error al obtener productos' });
  }
});


// Eliminar un producto del pedido activo de la mesa, sin importar el orden
router.delete('/:mesaId/producto/:productoId', async (req, res) => {
  const mesaId = parseInt(req.params.mesaId);
  const productoId = parseInt(req.params.productoId);

  try {
    // Buscar el pedido activo de esa mesa que contiene ese producto
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
      return res.status(404).json({ mensaje: 'Producto no encontrado en pedidos activos' });
    }

    const pedidoId = pedidoConProducto[0].PedidoId;

    // Eliminar el producto del pedido
    await db.executeQueryWithNamedParams(
      'DELETE FROM DetallePedido WHERE PedidoId = @PedidoId AND ProductoId = @ProductoId',
      { PedidoId: pedidoId, ProductoId: productoId }
    );

    // Si el pedido quedó sin productos, eliminarlo
    const productosRestantes = await db.executeQueryWithNamedParams(
      'SELECT COUNT(*) AS total FROM DetallePedido WHERE PedidoId = @PedidoId',
      { PedidoId: pedidoId }
    );

    if (productosRestantes[0].total === 0) {
      // Eliminar pedido vacío
      await db.executeQueryWithNamedParams(
        'DELETE FROM Pedidos WHERE Id = @PedidoId',
        { PedidoId: pedidoId }
      );

      // 🔴 Aquí verificar si hay más pedidos activos para esa mesa
      const pedidosRestantes = await db.executeQueryWithNamedParams(
        'SELECT COUNT(*) AS total FROM Pedidos WHERE MesaId = @MesaId AND Estado != \'Pagado\'',
        { MesaId: mesaId }
      );

      // ✅ Solo si ya no hay más pedidos activos, se pone en Libre
      if (pedidosRestantes[0].total === 0) {
        await db.executeQueryWithNamedParams(
          'UPDATE Mesas SET Estado = \'Libre\' WHERE Id = @MesaId',
          { MesaId: mesaId }
        );
        req.io.emit('mesa-actualizada', { mesaId: mesaId, estado: 'Libre' });
      }
    }

    res.json({ mensaje: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar producto del pedido:', error);
    res.status(500).json({ mensaje: 'Error en servidor' });
  }
});

//
router.post('/marcar-listo', async (req, res) => {
  const { plato, mesaId } = req.body;

  try {
    // Encuentra el pedido activo de esa mesa
    const pedido = await db.executeQueryWithNamedParams(
      'SELECT TOP 1 Id FROM Pedidos WHERE MesaId = @MesaId AND Estado = \'Pendiente\' ORDER BY Fecha DESC',
      { MesaId: mesaId }
    );

    if (pedido.length === 0) {
      return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    }

    const pedidoId = pedido[0].Id;

    // 🔁 Aquí actualizamos el estado del plato a 'Listo' en lugar de eliminarlo
    await db.executeQueryWithNamedParams(
      `UPDATE DetallePedido 
       SET Estado = 'Listo' 
       WHERE PedidoId = @PedidoId AND ProductoId IN 
       (SELECT Id FROM Productos WHERE Nombre = @Nombre)`,
      { PedidoId: pedidoId, Nombre: plato }
    );

    res.json({ mensaje: 'Plato marcado como listo' });
  } catch (err) {
    console.error('Error al marcar plato como listo:', err);
    res.status(500).json({ mensaje: 'Error interno' });
  }
});

//
router.get('/pendientes/cocinero/:nombre', async (req, res) => {
  const cocinero = req.params.nombre;

  try {
    // 1. Asigna HoraIngreso = GETDATE() a todos los DetallePedido sin hora y estado pendiente del cocinero
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

    // 2. Consulta los pedidos pendientes para ese cocinero (ya tendrán HoraIngreso)
    const result = await db.executeQueryWithNamedParams(`
    SELECT 
      dp.Id as DetalleId, 
      dp.ProductoId, 
      dp.PedidoId, 
      dp.Cantidad, 
      FORMAT(dp.HoraIngreso, 'yyyy-MM-dd HH:mm:ss') AS HoraIngreso,
            p.Nombre AS Plato, c.Nombre AS Categoria, pe.MesaId
      FROM DetallePedido dp
      JOIN Productos p ON p.Id = dp.ProductoId
      JOIN Categorias c ON c.Id = p.CategoriaId
      JOIN Pedidos pe ON pe.Id = dp.PedidoId
      JOIN AsignacionCategoriasCocinero ac ON ac.CategoriaId = p.CategoriaId
      WHERE dp.Estado = 'pendiente' AND ac.CocineroNombre = @cocinero
    `, { cocinero });

    res.json(result);
  } catch (error) {
    console.error('❌ Error al obtener pendientes del cocinero:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener todas las mesas
router.get('/mesas', async (req, res) => {
  try {
    const mesas = await db.executeQuery('SELECT * FROM Mesas');
    res.json(mesas);
  } catch (error) {
    console.error('❌ Error al obtener mesas:', error);
    res.status(500).json({ mensaje: 'Error al obtener mesas' });
  }
});


module.exports = router;
