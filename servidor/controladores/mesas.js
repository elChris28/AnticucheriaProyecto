const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Obtener mesas
router.get('/', async (req, res) => {
  try {
    const mesas = await db.executeQuery('SELECT * FROM Mesas');
    res.json(mesas);
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener mesas' });
  }
});

// Agregar mesa
router.post('/', async (req, res) => {
  const { Estado } = req.body;
  try {
    const query = 'INSERT INTO Mesas (Estado) VALUES (@Estado)';
    await db.executeQueryWithNamedParams(query, { Estado });
    res.status(201).json({ mensaje: 'Mesa agregada' });
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al agregar mesa' });
  }
});

// Editar mesa
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { Estado } = req.body;
  try {
    const query = 'UPDATE Mesas SET Estado = @Estado WHERE Id = @Id';
    await db.executeQueryWithNamedParams(query, { Id: id, Estado });
    res.json({ mensaje: 'Mesa actualizada' });
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al actualizar mesa' });
  }
});

// Eliminar mesa
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const query = 'DELETE FROM Mesas WHERE Id = @Id';
    await db.executeQueryWithNamedParams(query, { Id: id });
    res.json({ mensaje: 'Mesa eliminada' });
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al eliminar mesa' });
  }
});

// PUT /api/mesas/:id/estado
router.put('/:id/estado', async (req, res) => {
  const id = parseInt(req.params.id);
  const { Estado } = req.body;
  try {
    await db.executeQueryWithNamedParams('UPDATE Mesas SET Estado = @Estado WHERE Id = @Id', { Id: id, Estado });
    res.json({ mensaje: 'Estado actualizado' });
  } catch (error) {
    console.error('Error al actualizar estado de mesa', error);
    res.status(500).json({ mensaje: 'Error al actualizar estado' });
  }
});

module.exports = router;