const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  username: { type: String, required: true }, // 發送者名稱
  message: { type: String, required: true }, // 訊息內容
  timestamp: { type: Date, default: Date.now } // 發送時間
});

module.exports = mongoose.model('Message', messageSchema);
