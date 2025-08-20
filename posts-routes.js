const express = require('express');
const router = express.Router();

// 測試路由
router.get('/', (req, res) => {
  res.send('Posts API is working');
});

module.exports = router;
