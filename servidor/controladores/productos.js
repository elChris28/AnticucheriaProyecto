const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Obtener productos con nombre de categoría
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        p.Id, p.Nombre, p.Precio, p.Estado, c.Nombre AS Categoria
      FROM Productos p
      JOIN Categorias c ON p.CategoriaId = c.Id
      WHERE p.Estado = 1
    `;
    const productos = await db.executeQuery(query);
    res.json(productos);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ mensaje: 'Error al obtener productos' });
  }
});

// Agregar nuevo producto
router.post('/', async (req, res) => {
  const { Nombre, Precio, CategoriaId } = req.body;
  try {
    const query = `
      INSERT INTO Productos (Nombre, Precio, CategoriaId, Estado)
      VALUES (@Nombre, @Precio, @CategoriaId, 1)
    `;
    await db.executeQueryWithNamedParams(query, { Nombre, Precio, CategoriaId });
    res.status(201).json({ mensaje: 'Producto agregado correctamente' });
  } catch (err) {
    console.error('Error al agregar producto:', err);
    res.status(500).json({ mensaje: 'Error al agregar producto' });
  }
});

// Editar producto
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { Nombre, Precio } = req.body;
  try {
    const query = `
      UPDATE Productos
      SET Nombre = @Nombre, Precio = @Precio
      WHERE Id = @Id
    `;
    await db.executeQueryWithNamedParams(query, { Id: id, Nombre, Precio });
    res.json({ mensaje: 'Producto actualizado' });
  } catch (err) {
    console.error('Error al actualizar producto:', err);
    res.status(500).json({ mensaje: 'Error al actualizar producto' });
  }
});

// Eliminar producto
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const query = 'UPDATE Productos SET Estado = 0 WHERE Id = @Id';
    await db.executeQueryWithNamedParams(query, { Id: id });
    res.json({ mensaje: 'Producto eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar producto:', err);
    res.status(500).json({ mensaje: 'Error al eliminar producto' });
  }
});

// Obtener categorías activas
router.get('/categorias', async (req, res) => {
  try {
    const categorias = await db.executeQuery('SELECT * FROM Categorias WHERE Estado = 1');
    res.json(categorias);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ mensaje: 'Error al obtener categorías' });
  }
});

// Obtener productos agrupados por categoría
router.get('/categorias-con-productos', async (req, res) => {
  try {
    const rows = await db.executeQuery(`
      SELECT 
        p.Id AS ProductoId, p.Nombre AS ProductoNombre, p.Precio, c.Id AS CategoriaId, c.Nombre AS CategoriaNombre
      FROM Productos p
      INNER JOIN Categorias c ON p.CategoriaId = c.Id
      WHERE p.Estado = 1 AND c.Estado = 1
    `);

    const categoriasMap = {};

    for (const row of rows) {
      const catId = row.CategoriaId;
      if (!categoriasMap[catId]) {
        categoriasMap[catId] = {
          Id: catId,
          Nombre: row.CategoriaNombre,
          Productos: []
        };
      }

      categoriasMap[catId].Productos.push({
        Id: row.ProductoId,
        Nombre: row.ProductoNombre,
        Precio: row.Precio
      });
    }

    res.json(Object.values(categoriasMap));
  } catch (error) {
    console.error('Error al agrupar productos por categoría:', error);
    res.status(500).json({ mensaje: 'Error al obtener productos por categoría' });
  }
});


// Agregar nueva categoría
router.post('/categorias', async (req, res) => {
  const { Nombre } = req.body;
  try {
    const query = 'INSERT INTO Categorias (Nombre) VALUES (@Nombre)';
    await db.executeQueryWithNamedParams(query, { Nombre });
    res.status(201).json({ mensaje: 'Categoría agregada correctamente' });
  } catch (error) {
    console.error('Error al agregar categoría:', error);
    res.status(500).json({ mensaje: 'Error al agregar categoría' });
  }
});

// Editar categoría
router.put('/categorias/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { Nombre } = req.body;
  try {
    const query = 'UPDATE Categorias SET Nombre = @Nombre WHERE Id = @Id';
    await db.executeQueryWithNamedParams(query, { Id: id, Nombre });
    res.json({ mensaje: 'Categoría actualizada correctamente' });
  } catch (error) {
    console.error('Error al editar categoría:', error);
    res.status(500).json({ mensaje: 'Error al editar categoría' });
  }
});

// Eliminar categoría
router.delete('/categorias/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const query = 'UPDATE Categorias SET Estado = 0 WHERE Id = @Id';
    await db.executeQueryWithNamedParams(query, { Id: id });
    res.json({ mensaje: 'Categoría eliminada (estado=0)' });
  } catch (error) {
    console.error(' Error al eliminar categoría:', error);
    res.status(500).json({ mensaje: 'Error al eliminar categoría' });
  }
});

module.exports = router;