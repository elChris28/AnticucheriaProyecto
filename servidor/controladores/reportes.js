const express = require('express');
const router = express.Router();
const gestionarPagos = require('../modelos/gestionarPagos');

// Obtener todas las ventas
router.get('/', async (req, res) => {
  try {
    const ventas = await gestionarPagos.obtenerVentas();
    res.json(ventas);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

// Eliminar una venta
router.delete('/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const result = await gestionarPagos.eliminarVenta(id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar venta' });
  }
});

// Editar una venta (cambiar método de pago)
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const { metodoPago } = req.body;

  try {
    const result = await gestionarPagos.editarVenta(id, metodoPago);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error al editar venta' });
  }
});

module.exports = router;
