const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;

// 使用中間件
app.use(bodyParser.json());
app.use(express.static('public'));

// ----- 計數器用於統計上線人數 -----
let totalClients = 0;

const cors = require('cors');
app.use(cors());

app.use(cors({
  origin: '*', // 允許所有來源
}));

const path = require('path');

// 添加這一行，讓 '/' 路由指向登入頁面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// 添加保護路由，訪問聊天室前檢查登入狀態
app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// MongoDB 連接
mongoose.connect('mongodb+srv://yu:A12345654321a@cluster0.kfreu.mongodb.net/chatbar?retryWrites=true&w=majority')
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(bodyParser.json());
app.use(express.static('public'));

// ----- 定義 User 模型 -----
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userId: { type: Number, unique: true },
});

userSchema.plugin(AutoIncrement, { inc_field: 'userId' });
const User = mongoose.model('User', userSchema);

// ----- 定義 Message 模型 -----
const messageSchema = new mongoose.Schema({
  username: { type: String, required: true },
  message: { type: String, required: true },
  userId: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model('Message', messageSchema);

// ----- 註冊路由 -----
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: '請填寫所有欄位' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: '該 Email 已被註冊' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({
      message: '註冊成功',
      user: { userId: newUser.userId, username: newUser.username },
    });
  } catch (error) {
    console.error('註冊錯誤:', error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// ----- 登入路由 -----
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: '請填寫 Email 和密碼' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: '帳號或密碼錯誤' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: '帳號或密碼錯誤' });

    // 傳回完整用戶資訊 (包含 userId)
    res.status(200).json({
      message: '登入成功',
      user: { userId: user.userId, username: user.username, email: user.email }, // 返回 userId
    });
  } catch (error) {
    console.error('伺服器錯誤:', error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});



// ----- Socket.IO 邏輯 -----
io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);
  totalClients++; // 使用者連接時加一
  io.emit('clients-total', totalClients); // 廣播目前連線總數

  Message.find().sort({ timestamp: 1 }).then((messages) => {
    socket.emit('load-messages', messages);
  });

  socket.on('message', async (data) => {
    const newMessage = new Message({
      username: data.username,
      message: data.message,
      userId: data.userId,
    });

    try {
      await newMessage.save();
      io.emit('chat-message', { ...data, timestamp: newMessage.timestamp });
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`A user disconnected: ${socket.id}`);
    totalClients--; // 使用者斷線時減一
    io.emit('clients-total', totalClients); // 廣播更新後的連線總數
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

  // 廣播「正在打字」事件
  socket.on('feedback', (data) => {
    socket.broadcast.emit('feedback', data); // 廣播給其他用戶
  });

  socket.on('disconnect', () => {
    console.log(`A user disconnected: ${socket.id}`);
  });
});
