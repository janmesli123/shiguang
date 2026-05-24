/**
 * 拾光 — 碎片时间学习助手
 * 启动: node server.js
 * 访问: http://localhost:3000 (本机) 或 http://<你的IP>:3000 (手机)
 */
const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// 解析 JSON 请求体
app.use(express.json());

// 静态文件服务（前端页面）
app.use(express.static(path.join(__dirname, 'public')));

// API 路由
app.use('/api/cards', require('./api/cards'));
app.use('/api/ai', require('./api/ai'));

// 所有其他路由返回首页（SPA）— Express 5 用 {*path} 语法
app.get('{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 监听 0.0.0.0 使局域网可访问
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  ✨ 拾光已启动！`);
  console.log(`  本机访问: http://localhost:${PORT}`);
  console.log(`  手机访问: http://<你的电脑IP>:${PORT}\n`);
});
