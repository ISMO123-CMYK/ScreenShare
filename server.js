// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

let currentText = '';
let winner = null;

const generateRandomText = () => {
  const texts = [
    "hello world",
    "fast fingers",
    "javascript is cool",
    "type this quick",
    "competition begins",
    "socket io rocks"
  ];
  return texts[Math.floor(Math.random() * texts.length)];
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (name) => {
    console.log(`${name} joined.`);
    socket.data.name = name;

    // Send current challenge
    if (!currentText) {
      currentText = generateRandomText();
      winner = null;
      io.emit('start', currentText);
    } else {
      socket.emit('start', currentText);
    }
  });

  socket.on('typed', (typedText) => {
    if (typedText === currentText && !winner) {
      winner = socket.data.name;
      io.emit('winner', winner);
      // Reset in 5 seconds
      setTimeout(() => {
        currentText = generateRandomText();
        winner = null;
        io.emit('start', currentText);
      }, 5000);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});
app.use(express.static("public"))
server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
