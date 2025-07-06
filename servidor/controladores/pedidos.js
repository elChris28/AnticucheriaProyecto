const express = require('express');
const router = express.Router();
const gestionarPedidoDePlato = require('../modelos/gestionarPedidoDePlato');
const gestionarPedidoaCocina= require('../modelos/gestionarPedidosCocina');

// Registrar pedido
router.post('/', async (req, res) => {
  const { MesaId, Productos } = req.body;

  try {
    const { mensaje } = await gestionarPedidoDePlato.registrarPedido(MesaId, Productos);

    req.io.emit('mesa-actualizada', { mesaId: MesaId, estado: 'Ocupado' });

    res.status(201).json({ mensaje });
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al registrar pedido' });
  }
});

// Lista los productos pedidos
router.get('/mesa/:mesaId', async (req, res) => {
  const mesaId = parseInt(req.params.mesaId);

  try {
    const productos = await gestionarPedidoDePlato.obtenerProductosPendientesDeMesa(mesaId);
    res.json(productos);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener productos' });
  }
});

// Eliminar un producto del pedido activo de la mesa
router.delete('/:mesaId/producto/:productoId', async (req, res) => {
  const mesaId = parseInt(req.params.mesaId);
  const productoId = parseInt(req.params.productoId);

  try {
    const { mensaje } = await gestionarPedidoDePlato.eliminarProductoDelPedido(mesaId, productoId);

    req.io.emit('mesa-actualizada', { mesaId: mesaId, estado: 'Libre' });
    
    res.json({ mensaje });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error en servidor' });
  }
});

// Marcar un plato de una mesa como listo
router.post('/marcar-listo', async (req, res) => {
  const { plato, mesaId } = req.body;

  try {
    const { mensaje } = await gestionarPedidoaCocina.marcarPlatoListo(plato, mesaId);
    res.json({ mensaje });
  } catch (err) {
    res.status(500).json({ mensaje: 'Error interno' });
  }
});


// Muestra los platos pendientes asignados al cocinero
router.get('/pendientes/cocinero/:nombre', async (req, res) => {
  const cocinero = req.params.nombre;

  try {
    const result = await gestionarPedidoaCocina.obtenerPlatosPendientesCocinero(cocinero);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Mostrar mesas
router.get('/mesas', async (req, res) => {
  try {
    const mesas = await gestionarPedidoaCocina.obtenerMesas();
    res.json(mesas);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener mesas' });
  }
});

module.exports = router;
