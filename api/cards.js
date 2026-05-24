/**
 * 卡片 API 路由
 * 提供增删改查接口，数据存在 SQLite 数据库
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { sm2 } = require('../public/js/sm2');
const db = require('../db');

const router = express.Router();

// 预编译 SQL 语句（性能更好）
const stmts = {
  getAll: db.prepare('SELECT * FROM cards ORDER BY created DESC'),
  getDue: db.prepare('SELECT * FROM cards WHERE nextReview <= ? ORDER BY nextReview ASC'),
  getById: db.prepare('SELECT * FROM cards WHERE id = ?'),
  insert: db.prepare(`INSERT INTO cards (id, front, back, tags, created, nextReview, interval, ease, repetitions, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  update: db.prepare(`UPDATE cards SET repetitions = ?, interval = ?, ease = ?, nextReview = ? WHERE id = ?`),
  delete: db.prepare('DELETE FROM cards WHERE id = ?'),
  countTotal: db.prepare('SELECT COUNT(*) as n FROM cards'),
  countDue: db.prepare('SELECT COUNT(*) as n FROM cards WHERE nextReview <= ?'),
  countLearned: db.prepare('SELECT COUNT(*) as n FROM cards WHERE repetitions > 0'),
  countNew: db.prepare('SELECT COUNT(*) as n FROM cards WHERE repetitions = 0'),
};

/** tags 在数据库里存 JSON 字符串，读出来要解析 */
function parseCard(row) {
  if (!row) return null;
  return { ...row, tags: JSON.parse(row.tags || '[]') };
}

// GET /api/cards — 获取所有卡片
router.get('/', (req, res) => {
  const cards = stmts.getAll.all().map(parseCard);
  res.json(cards);
});

// GET /api/cards/due — 获取今天需要复习的卡片
router.get('/due', (req, res) => {
  const now = new Date().toISOString();
  const cards = stmts.getDue.all(now).map(parseCard);
  res.json(cards);
});

// GET /api/cards/stats — 学习统计
router.get('/stats', (req, res) => {
  const now = new Date().toISOString();
  res.json({
    total: stmts.countTotal.get().n,
    due: stmts.countDue.get(now).n,
    learned: stmts.countLearned.get().n,
    newCards: stmts.countNew.get().n,
  });
});

// POST /api/cards — 添加一张或多张卡片
router.post('/', (req, res) => {
  let input = req.body;
  if (!Array.isArray(input)) input = [input];

  const now = new Date().toISOString();
  const newCards = [];

  // 用事务批量插入（全成功或全失败，速度也更快）
  const insertMany = db.transaction((items) => {
    for (const item of items) {
      const card = {
        id: uuidv4(),
        front: item.front || '',
        back: item.back || '',
        tags: item.tags || [],
        created: now,
        nextReview: now,
        interval: 0,
        ease: 2.5,
        repetitions: 0,
        source: item.source || 'manual'
      };
      stmts.insert.run(card.id, card.front, card.back, JSON.stringify(card.tags),
        card.created, card.nextReview, card.interval, card.ease, card.repetitions, card.source);
      newCards.push(card);
    }
  });

  insertMany(input);
  res.json({ added: newCards.length, cards: newCards });
});

// PUT /api/cards/:id/review — 复习评分
router.put('/:id/review', (req, res) => {
  const row = stmts.getById.get(req.params.id);
  if (!row) return res.status(404).json({ error: '卡片不存在' });

  const { quality } = req.body;
  if (quality === undefined || quality < 0 || quality > 5) {
    return res.status(400).json({ error: '评分必须是 0~5' });
  }

  const result = sm2(quality, row.repetitions, row.interval, row.ease);
  stmts.update.run(result.repetitions, result.interval, result.ease, result.nextReview, row.id);

  const updated = parseCard(stmts.getById.get(row.id));
  res.json(updated);
});

// DELETE /api/cards/:id — 删除卡片
router.delete('/:id', (req, res) => {
  const result = stmts.delete.run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: '卡片不存在' });
  }
  res.json({ deleted: true });
});

module.exports = router;
