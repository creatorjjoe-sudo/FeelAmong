const { Server } = require('socket.io');
const mongoose = require('mongoose');
const User = require('../models/User');

let io;
const userSockets = new Map();
const typingSockets = new Map();

function getUserSockets(userId) {
  let sockets = userSockets.get(userId);
  if (!sockets) {
    sockets = new Set();
    userSockets.set(userId, sockets);
  }
  return sockets;
}

function isViewingChat(userId, viewerId) {
  return [...(userSockets.get(userId) || [])]
    .some((socket) => socket.data.chatWith === viewerId);
}

function notifyChatPresence(userId, contactId) {
  if (!contactId || !io) return;
  io.to(contactId).emit('presence_updated', {
    userId,
    viewingChat: isViewingChat(userId, contactId)
  });
}

function updateTyping(socket, recipientId) {
  const senderId = socket.data.userId;
  const previousRecipientId = socket.data.typingTo;
  const nextRecipientId = recipientId || null;
  if (previousRecipientId === nextRecipientId) {
    if (socket.data.typingTimeout) clearTimeout(socket.data.typingTimeout);
    socket.data.typingTimeout = nextRecipientId
      ? setTimeout(() => updateTyping(socket, null), 2500)
      : null;
    return;
  }

  if (socket.data.typingTimeout) {
    clearTimeout(socket.data.typingTimeout);
    socket.data.typingTimeout = null;
  }

  if (previousRecipientId) {
    const recipientTyping = typingSockets.get(previousRecipientId);
    const senderSockets = recipientTyping?.get(senderId);
    senderSockets?.delete(socket);
    if (senderSockets?.size === 0) {
      recipientTyping.delete(senderId);
      io.to(previousRecipientId).emit('user_typing', { userId: senderId, isTyping: false });
    }
    if (recipientTyping?.size === 0) typingSockets.delete(previousRecipientId);
  }

  socket.data.typingTo = nextRecipientId;
  if (!nextRecipientId) return;

  let recipientTyping = typingSockets.get(nextRecipientId);
  if (!recipientTyping) {
    recipientTyping = new Map();
    typingSockets.set(nextRecipientId, recipientTyping);
  }
  let senderSockets = recipientTyping.get(senderId);
  if (!senderSockets) {
    senderSockets = new Set();
    recipientTyping.set(senderId, senderSockets);
  }
  const wasTyping = senderSockets.size > 0;
  senderSockets.add(socket);
  if (!wasTyping) {
    io.to(nextRecipientId).emit('user_typing', { userId: senderId, isTyping: true });
  }
  socket.data.typingTimeout = setTimeout(() => updateTyping(socket, null), 2500);
}

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
      const normalizedUserId = String(userId || '');
      if (!mongoose.Types.ObjectId.isValid(normalizedUserId)) return;

      const previousUserId = socket.data.userId;
      if (previousUserId && previousUserId !== normalizedUserId) {
        getUserSockets(previousUserId).delete(socket);
      }

      socket.data.userId = normalizedUserId;
      socket.join(normalizedUserId);
      const sockets = getUserSockets(normalizedUserId);
      const wasOffline = sockets.size === 0;
      sockets.add(socket);
      if (wasOffline) {
        io.emit('presence_updated', { userId: normalizedUserId, online: true });
      }
      if (socket.data.chatWith) notifyChatPresence(normalizedUserId, socket.data.chatWith);
    });

    socket.on('set_chat_presence', (contactId) => {
      const userId = socket.data.userId;
      if (!userId) return;

      const nextContactId = mongoose.Types.ObjectId.isValid(String(contactId || ''))
        && String(contactId) !== userId
        ? String(contactId)
        : null;
      const previousContactId = socket.data.chatWith;
      if (previousContactId === nextContactId) return;

      socket.data.chatWith = nextContactId;
      notifyChatPresence(userId, previousContactId);
      notifyChatPresence(userId, nextContactId);
    });

    socket.on('typing', (data) => {
      const userId = socket.data.userId;
      const recipientId = String(data?.recipientId || '');
      if (!userId || data?.isTyping !== true || !mongoose.Types.ObjectId.isValid(recipientId) || recipientId === userId) {
        updateTyping(socket, null);
        return;
      }
      updateTyping(socket, recipientId);
    });

    socket.on('get_presence', async (contactId, callback) => {
      if (typeof callback !== 'function') return;
      const targetUserId = String(contactId || '');
      const viewerId = socket.data.userId;
      if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        callback({ error: 'Invalid user ID' });
        return;
      }

      try {
        const user = await User.findById(targetUserId).select('lastSeen');
        if (!user) {
          callback({ error: 'User not found' });
          return;
        }
        callback({
          userId: targetUserId,
          online: (userSockets.get(targetUserId)?.size || 0) > 0,
          viewingChat: Boolean(viewerId && isViewingChat(targetUserId, viewerId)),
          lastSeen: user.lastSeen
        });
      } catch (error) {
        console.error('Could not load user presence:', error.message);
        callback({ error: 'Could not load user presence' });
      }
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
      updateTyping(socket, null);
      const userId = socket.data.userId;
      if (!userId) return;

      const contactId = socket.data.chatWith;
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          const lastSeen = new Date();
          User.updateOne({ _id: userId }, { $set: { lastSeen } })
            .then(() => io.emit('presence_updated', { userId, online: false, lastSeen }))
            .catch((error) => console.error('Could not update user last seen:', error.message));
        }
      }
      notifyChatPresence(userId, contactId);
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