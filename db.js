/**
 * 数据库模块 — 用 SQLite 存卡片
 * SQLite 是一个轻量数据库，数据存在一个文件里，不需要装数据库软件
 */
const Database = require('better-sqlite3');
const path = require('path');

// 数据库文件存在 data 目录
const DB_PATH = path.join(__dirname, 'data', 'shiguang.db');
const db = new Database(DB_PATH);

// 开启 WAL 模式（写入更快，读写可以并发）
db.pragma('journal_mode = WAL');

// 建表（如果不存在）
db.exec(`
  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    tags TEXT DEFAULT '[]',
    created TEXT NOT NULL,
    nextReview TEXT NOT NULL,
    interval INTEGER DEFAULT 0,
    ease REAL DEFAULT 2.5,
    repetitions INTEGER DEFAULT 0,
    source TEXT DEFAULT 'manual'
  )
`);

module.exports = db;
