import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: {
    type: String,
    default: '🇳🇬',
    enum: ['🇳🇬', '🦅', '🦁', '🌴', '🗿']
  },
  online: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  createdAt: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isGroup: { type: Boolean, default: false },
  groupName: String,
  groupAvatar: String,
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);
const Chat = mongoose.model('Chat', chatSchema);

// REST API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Get all chats for a user
app.get('/api/chats/:userId', async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.params.userId
    })
    .populate('participants', 'name avatar online lastSeen')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a chat
app.get('/api/messages/:chatId', async (req, res) => {
  try {
    const messages = await Message.find({ chatId: req.params.chatId })
      .populate('senderId', 'name avatar')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new chat
app.post('/api/chats', async (req, res) => {
  try {
    const { participants, isGroup, groupName, groupAvatar } = req.body;
    
    // Check if chat already exists (for non-group chats)
    if (!isGroup) {
      const existingChat = await Chat.findOne({
        isGroup: false,
        participants: { $all: participants, $size: 2 }
      });
      
      if (existingChat) {
        return res.json(existingChat);
      }
    }

    const chat = new Chat({
      participants,
      isGroup,
      groupName,
      groupAvatar
    });

    await chat.save();
    await chat.populate('participants', 'name avatar online lastSeen');
    
    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create/register a user
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = new User({ name, email, password, avatar });
    await user.save();
    
    res.status(201).json({ 
      id: user._id, 
      name: user.name, 
      email: user.email, 
      avatar: user.avatar 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'name email avatar online lastSeen');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO for real-time messaging
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user:online', async (userId) => {
    onlineUsers.set(userId, socket.id);
    await User.findByIdAndUpdate(userId, { online: true });
    io.emit('user:status', { userId, online: true });
  });

  socket.on('message:send', async (data) => {
    try {
      const message = new Message({
        chatId: data.chatId,
        senderId: data.senderId,
        text: data.text
      });

      await message.save();
      await message.populate('senderId', 'name avatar');

      await Chat.findByIdAndUpdate(data.chatId, {
        lastMessage: message._id,
        updatedAt: Date.now()
      });

      // Emit to all participants
      io.to(data.chatId).emit('message:receive', message);

      // Send delivery confirmation
      setTimeout(async () => {
        message.status = 'delivered';
        await message.save();
        io.to(data.chatId).emit('message:status', {
          messageId: message._id,
          status: 'delivered'
        });
      }, 500);

    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  socket.on('chat:join', (chatId) => {
    socket.join(chatId);
  });

  socket.on('message:read', async (data) => {
    try {
      await Message.updateMany(
        { chatId: data.chatId, _id: { $in: data.messageIds } },
        { status: 'read' }
      );
      
      io.to(data.chatId).emit('messages:read', data.messageIds);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });

  socket.on('typing:start', (data) => {
    socket.to(data.chatId).emit('typing:display', {
      userId: data.userId,
      userName: data.userName
    });
  });

  socket.on('typing:stop', (data) => {
    socket.to(data.chatId).emit('typing:hide', {
      userId: data.userId
    });
  });

  socket.on('disconnect', async () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        await User.findByIdAndUpdate(userId, {
          online: false,
          lastSeen: Date.now()
        });
        io.emit('user:status', { userId, online: false });
        break;
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});