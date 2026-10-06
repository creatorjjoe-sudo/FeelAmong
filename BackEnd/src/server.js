const express = require('express');
const http = require('http'); // 1. Import HTTP module
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const { initSocket } = require('./config/socket'); // 2. Import Socket Config

const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const chatRoutes = require('./routes/chatRoutes');
const videoRoutes = require('./routes/videoRoutes');
const searchRoutes = require('./routes/searchRoutes');
const userRoutes = require('./routes/userRoutes');
const savedItemRoutes = require('./routes/savedItemRoutes');

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/saves', savedItemRoutes);

// 3. Create HTTP Server & Pass to Socket.io
const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 5000;

// 4. Listen on HTTP Server instead of express app
server.listen(PORT, () => {
  console.log(`Server & Socket.io running on port ${PORT}`);
});