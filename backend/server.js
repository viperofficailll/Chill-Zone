const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

// Enable CORS for Express routes (Health checks etc)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"]
}));

const server = http.createServer(app);

// Configure Socket.io CORS to accept connections from Netlify
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (Netlify, Localhost, etc.)
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  }
});

// State
let waitingUsers = []; // Simple queue: [socketId, socketId, ...]
let activePairs = {}; // { socketId: partnerSocketId }

// Health Check Route (Crucial for Render deployments)
app.get('/', (req, res) => {
  res.send('Chill Zone Signaling Server is Running. Status: OK.');
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-queue', (userData) => {
    // Prevent double queueing
    if (waitingUsers.includes(socket.id)) return;

    console.log(`User ${socket.id} joined queue. Gender: ${userData.myGender}`);

    // If someone is waiting, match them!
    if (waitingUsers.length > 0) {
      const partnerId = waitingUsers.shift();
      
      // Store the pairing
      activePairs[socket.id] = partnerId;
      activePairs[partnerId] = socket.id;

      console.log(`Matching ${socket.id} with ${partnerId}`);

      // Notify both to start WebRTC
      // Initiator (socket) creates the Offer
      io.to(socket.id).emit('match-found', { initiator: true });
      io.to(partnerId).emit('match-found', { initiator: false });
      
    } else {
      waitingUsers.push(socket.id);
    }
  });

  // WebRTC Signaling Relay
  socket.on('signal', (data) => {
    const partnerId = activePairs[socket.id];
    if (partnerId) {
      io.to(partnerId).emit('signal', {
        type: data.type,
        payload: data.payload
      });
    }
  });

  socket.on('chat-message', (text) => {
    const partnerId = activePairs[socket.id];
    if (partnerId) {
      io.to(partnerId).emit('chat-message', text);
    }
  });

  // Disconnect handling
  const handleDisconnect = () => {
    // Remove from wait queue
    waitingUsers = waitingUsers.filter(id => id !== socket.id);

    // Notify partner
    const partnerId = activePairs[socket.id];
    if (partnerId) {
      io.to(partnerId).emit('peer-disconnected');
      delete activePairs[partnerId];
      delete activePairs[socket.id];
    }
    console.log('User disconnected:', socket.id);
  };

  socket.on('disconnect', handleDisconnect);
  socket.on('leave', handleDisconnect);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});