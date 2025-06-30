const express = require('express');
const router = express.Router();
const db = require('../config/db'); 

// Obtener todas las ventas
router.get('/', async (req, res) => {
  try {
    const ventas = await db.executeQuery(`
    SELECT v.id AS IdVenta, v.MetodoPago, v.Total, v.Fecha, m.id AS NumeroMesa
    FROM Ventas v
    JOIN Mesas m ON v.MesaId = m.id
    ORDER BY v.Fecha DESC
    `);
    res.json(ventas); 
  } catch (err) {
    console.error('Error al obtener ventas:', err);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

// Eliminar una venta
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await db.executeNonQuery('DELETE FROM DetalleVenta WHERE VentaId = @param0', [id]);
    await db.executeNonQuery('DELETE FROM Ventas WHERE id = @param0', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error al eliminar venta:', err);
    res.status(500).json({ error: 'Error al eliminar venta' });
  }
});

// Editar una venta (cambiar método de pago)
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const { metodoPago } = req.body;
  try {
    await db.executeNonQuery('UPDATE Ventas SET MetodoPago = @param0 WHERE Id = @param1', [metodoPago, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error al editar venta:', err);
    res.status(500).json({ error: 'Error al editar venta' });
  }
});

module.exports = router;
