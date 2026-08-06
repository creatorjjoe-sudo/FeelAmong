import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authroutes.js';
import messageRoutes from './routes/messageroutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Establish Base Routing Definitions
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

// Real-Time Stateful In-Memory Context Trackers
const onlineUsers = {};
const activeChatPartners = {};
// NEW: Map tracking who is typing and to whom -> { typingUserId: targetUserId }
const typingStatus = {};

io.on('connection', (socket) => {
    let connectedUserId = null;

    // Track user when they declare their session active
    socket.on('user_connected', (userId) => {
        if (!userId) return;
        connectedUserId = userId;
        onlineUsers[userId] = socket.id;
        
        // Broadcast presence and typing updates globally
        io.emit('presence_update', {
            onlineUsers: Object.keys(onlineUsers),
            activeChatPartners,
            typingStatus
        });
    });

    // Handle view adjustments (e.g., clicking a specific user's chat window)
    socket.on('enter_chat_view', ({ userId, partnerId }) => {
        if (!userId) return;
        activeChatPartners[userId] = partnerId;

        io.emit('presence_update', {
            onlineUsers: Object.keys(onlineUsers),
            activeChatPartners,
            typingStatus
        });
    });

    // Handle when a user navigates back to the main directory view
    socket.on('leave_chat_view', (userId) => {
        if (!userId) return;
        delete activeChatPartners[userId];
        delete typingStatus[userId]; // Safety cleanup if they leave while typing

        io.emit('presence_update', {
            onlineUsers: Object.keys(onlineUsers),
            activeChatPartners,
            typingStatus
        });
    });

    // NEW: Handle Typing Initiation Signal
    socket.on('typing_start', ({ userId, partnerId }) => {
        if (!userId || !partnerId) return;
        typingStatus[userId] = partnerId;
        io.emit('presence_update', {
            onlineUsers: Object.keys(onlineUsers),
            activeChatPartners,
            typingStatus
        });
    });

    // NEW: Handle Typing Cease Signal
    socket.on('typing_stop', (userId) => {
        if (!userId) return;
        delete typingStatus[userId];
        io.emit('presence_update', {
            onlineUsers: Object.keys(onlineUsers),
            activeChatPartners,
            typingStatus
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
            delete typingStatus[connectedUserId];
            
            io.emit('presence_update', {
                onlineUsers: Object.keys(onlineUsers),
                activeChatPartners,
                typingStatus
            });
        }
    });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Engine:', process.env.MONGO_URI))
  .then(() => {
    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    });
  })
  .catch((err) => console.error('❌ Database boot critical exception:', err));
