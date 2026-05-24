/**
 * 数据库模块 — 用 JSON 文件存卡片
 * 简单可靠，不需要编译原生模块，云端部署兼容性好
 */
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'cards.json');

// 确保 data 目录和文件存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
}

/** 读取所有卡片 */
function readCards() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** 写入卡片 */
function writeCards(cards) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(cards, null, 2), 'utf-8');
}

module.exports = { readCards, writeCards };
