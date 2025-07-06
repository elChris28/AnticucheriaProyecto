const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

app.use((req, res, next) => {
  req.io = io;
  next();
});

// Rutas para operaciones con base de datos
app.use('/api/productos', require('./controladores/productos'));
app.use('/api/mesas', require('./controladores/mesas'));
app.use('/api/pedidos', require('./controladores/pedidos'));
app.use('/api', require('./controladores/asignaciones'));
app.use('/api/pagos', require('./controladores/pagos'));
app.use('/api/reportes', require('./controladores/reportes'));
app.use('/api/dashboard', require('./controladores/dashboard')); 

app.use(express.static(path.join(__dirname, '..' , 'cliente')));

// Ruta principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, '..' , "cliente", "login","index.html"));
});

// WebSocket para comunicación en tiempo real
const cocinerosConectados = {};
const pedidosListos = { cocinero_1: [], cocinero_2: [] };


io.on("connection", (socket) => {
  console.log("Cliente conectado");

  socket.on("rolCocinero", (rol) => {
    cocinerosConectados[socket.id] = rol;
    socket.emit("pedidosListos", pedidosListos[rol]);
  });

  socket.on("enviarPedido", (pedido) => {
    let platosCocinero1 = [];
    let platosCocinero2 = [];

    pedido.platos.forEach((plato) => {
      const categoria = pedido.categorias[1];
      if (categoriasCocinero1.includes(categoria)) platosCocinero1.push(plato);
      else if (categoriasCocinero2.includes(categoria)) platosCocinero2.push(plato);
    });

    if (platosCocinero1.length > 0) {
      const data = {
        id: generateUniqueId(),
        mesaId: pedido.mesaId,
        platos: platosCocinero1,
        cocinero: "cocinero_1"
      };
      io.emit("nuevoPedido", data);
    }

    if (platosCocinero2.length > 0) {
      const data = {
        id: generateUniqueId(),
        mesaId: pedido.mesaId,
        platos: platosCocinero2,
        cocinero: "cocinero_2"
      };
      io.emit("nuevoPedido", data);
    }
  });

  socket.on("pedidoListo", ({ pedidoId, cocinero, mesaId, platos }) => {
    const info = {
      mesaId,
      fechaHora: new Date().toLocaleString(),
      platos: platos.map(p => ({ nombre: p.nombre, cantidad: p.cantidad }))
    };
    pedidosListos[cocinero].push(info);
    actualizarPedidosCocinero(cocinero);
  });

  socket.on("eliminarPedidoListo", ({ index, cocinero }) => {
    if (pedidosListos[cocinero]) {
      pedidosListos[cocinero].splice(index, 1);
      actualizarPedidosCocinero(cocinero); 
    }
  });

  socket.on("eliminarTodosPedidosListos", (cocinero) => {
    pedidosListos[cocinero] = [];
    actualizarPedidosCocinero(cocinero);
  });

  socket.on("confirmarPago", (data) => {
    io.emit("ventaConfirmada", data);
  });

  socket.on("actualizarMesa", () => {
    io.emit("estadoMesasActualizado");
  });

  socket.on("disconnect", () => {
    console.log("Cliente desconectado");
    delete cocinerosConectados[socket.id];
  });

  function actualizarPedidosCocinero(cocinero) {
    for (const [id, rol] of Object.entries(cocinerosConectados)) {
      if (rol === cocinero) {
        io.to(id).emit("pedidosListos", pedidosListos[cocinero]);
      }
    }
  }
});


// Inicio del servidor
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Accesible en la red: http://${getLocalIPAddress()}:${PORT}`);
});

function getLocalIPAddress() {
  const { networkInterfaces } = require("os");
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
}