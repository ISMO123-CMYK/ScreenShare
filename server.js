// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });
app.use(express.static("public"))
io.on('connection', socket => {
  console.log('User connected');

  socket.on('screen-data', data => {
    // Broadcast to parent dashboard
    socket.broadcast.emit('screen-data', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(3000, () => console.log('Server running on port 3000'));
