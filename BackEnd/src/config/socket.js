const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', // Allow connections from frontend
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // Join a personal room based on user ID for private messaging
    socket.on('join_room', (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined room ${userId}`);
    });

    // Real-Time Private Chat
    socket.on('send_message', (data) => {
      // Data contains: { sender, recipient, text, createdAt }
      io.to(data.recipient).emit('receive_message', data);
    });

    // Real-Time Post Like Update Broadcast
    socket.on('like_post', (data) => {
      // Data contains: { postId, likesCount, userId, isLiked }
      socket.broadcast.emit('post_liked_updated', data);
    });

    socket.on('disconnect', () => {
      console.log(`User Disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized!');
  }
  return io;
};

module.exports = { initSocket, getIO };