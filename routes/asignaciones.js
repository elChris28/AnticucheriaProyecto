const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener todas las categorías
router.get('/categorias', async (req, res) => {
  try {
    const categorias = await db.executeQuery('SELECT Id, Nombre FROM Categorias');
    res.json(categorias);
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener categorías' });
  }
});

// Guardar asignación
router.post('/asignaciones', async (req, res) => {
  const { cocinero, categoriaId } = req.body;

  try {
    await db.executeQueryWithNamedParams(
      `INSERT INTO AsignacionCategoriasCocinero (CocineroNombre, CategoriaId)
       VALUES (@CocineroNombre, @CategoriaId)`,
      { CocineroNombre: cocinero, CategoriaId: categoriaId }
    );
    res.json({ mensaje: 'Asignación guardada' });
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al guardar asignación' });
  }
});

// Obtener asignaciones actuales
router.get('/asignaciones', async (req, res) => {
  try {
    const asignaciones = await db.executeQuery(`
      SELECT a.Id, a.CocineroNombre, c.Nombre AS CategoriaNombre
      FROM AsignacionCategoriasCocinero a
      JOIN Categorias c ON a.CategoriaId = c.Id
    `);
    res.json(asignaciones);
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener asignaciones' });
  }
});

module.exports = router;
