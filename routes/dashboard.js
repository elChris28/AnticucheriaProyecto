const express = require('express');
const router = express.Router();
const db = require('../db');

// Ruta para obtener los datos del dashboard
router.get('/', async (req, res) => {
  try {
    const totalVentasQuery = await db.executeQuery('SELECT ISNULL(SUM(Total), 0) AS total FROM Ventas');
    const pedidosActivosQuery = await db.executeQuery("SELECT COUNT(*) AS total FROM Pedidos WHERE Estado = 'Pendiente'");
    const mesasOcupadasQuery = await db.executeQuery("SELECT COUNT(*) AS total FROM Mesas WHERE Estado = 'Ocupado'");
    const productosQuery = await db.executeQuery('SELECT COUNT(*) AS total FROM Productos');
    const categoriasQuery = await db.executeQuery('SELECT COUNT(*) AS total FROM Categorias');
    const usuariosQuery = await db.executeQuery('SELECT COUNT(*) AS total FROM Usuarios');

    res.json({
      totalVentas: totalVentasQuery[0].total,
      pedidosActivos: pedidosActivosQuery[0].total,
      mesasOcupadas: mesasOcupadasQuery[0].total,
      productos: productosQuery[0].total,
      categorias: categoriasQuery[0].total,
      usuarios: usuariosQuery[0].total
    });
  } catch (err) {
    console.error('❌ Error en dashboard:', err);
    res.status(500).json({ error: 'Error al obtener datos del dashboard' });
  }
});

module.exports = router;
