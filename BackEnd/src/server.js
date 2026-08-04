import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/authroutes.js';
import messageRoutes from './routes/messageroutes.js';

const PORT = process.env.PORT || 8000;

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());

// Establish Base Routing Definitions
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

// Real-Time Stateful In-Memory Context Trackers
// onlineUsers: { userId: socketId }
const onlineUsers = {};
// activeChatPartners: { userId: currentTargetUserIdChattingWith }
const activeChatPartners = {};

io.on('connection', (socket) => {
    let connectedUserId = null;

    // Track user when they declare their session active
    socket.on('user_connected', (userId) => {
        if (!userId) return;
        connectedUserId = userId;
        onlineUsers[userId] = socket.id;
        
        // Broadcast presence updates globally
        io.emit('presence_update', {
            onlineUsers: Object.keys(onlineUsers),
            activeChatPartners
        });
    });

    // Handle view adjustments (e.g., clicking a specific user's chat window)
    socket.on('enter_chat_view', ({ userId, partnerId }) => {
        if (!userId) return;
        activeChatPartners[userId] = partnerId;

        io.emit('presence_update', {
            onlineUsers: Object.keys(onlineUsers),
            activeChatPartners
        });
    });

    // Handle when a user navigates back to the main directory view
    socket.on('leave_chat_view', (userId) => {
        if (!userId) return;
        delete activeChatPartners[userId];

        io.emit('presence_update', {
            onlineUsers: Object.keys(onlineUsers),
            activeChatPartners
        });
    });

    // Forward instant secure real-time message payloads
    socket.on('send_private_message', (messageData) => {
        const targetSocketId = onlineUsers[messageData.receiver];
        if (targetSocketId) {
            io.to(targetSocketId).emit('receive_private_message', messageData);
        }
    });

    // Gracefully handle browser tab closures or programmatic network breaks
    socket.on('disconnect', () => {
        if (connectedUserId) {
            delete onlineUsers[connectedUserId];
            delete activeChatPartners[connectedUserId];
            
            io.emit('presence_update', {
                onlineUsers: Object.keys(onlineUsers),
                activeChatPartners
            });
        }
    });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Engine:', process.env.MONGO_URI))
  .then(() => {
    server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    });
  })
  .catch((err) => console.error('❌ Database boot critical exception:', err));



