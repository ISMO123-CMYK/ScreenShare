// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });
const fetch = require('node-fetch'); // v2 if using CommonJS
const domain = 'https://screenshare-am2q.onrender.com/'; // change to your target domain

const ping = async () => {
  try {
    const res = await fetch(domain);
    console.log(`[${new Date().toISOString()}] Status: ${res.status}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error:`, err.message);
  }
};

setInterval(ping, 10000); // every 10 seconds
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
