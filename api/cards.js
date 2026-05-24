/**
 * 卡片 API 路由
 * 提供增删改查接口，数据存在 JSON 文件
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { sm2 } = require('../public/js/sm2');
const { readCards, writeCards } = require('../db');

const router = express.Router();

// GET /api/cards — 获取所有卡片
router.get('/', (req, res) => {
  res.json(readCards());
});

// GET /api/cards/due — 获取今天需要复习的卡片
router.get('/due', (req, res) => {
  const now = new Date().toISOString();
  const due = readCards().filter(c => c.nextReview <= now);
  res.json(due);
});

// GET /api/cards/stats — 学习统计
router.get('/stats', (req, res) => {
  const cards = readCards();
  const now = new Date().toISOString();
  res.json({
    total: cards.length,
    due: cards.filter(c => c.nextReview <= now).length,
    learned: cards.filter(c => c.repetitions > 0).length,
    newCards: cards.filter(c => c.repetitions === 0).length,
  });
});

// POST /api/cards — 添加一张或多张卡片
router.post('/', (req, res) => {
  const cards = readCards();
  let input = req.body;
  if (!Array.isArray(input)) input = [input];

  const now = new Date().toISOString();
  const newCards = input.map(item => ({
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
  }));

  cards.push(...newCards);
  writeCards(cards);
  res.json({ added: newCards.length, cards: newCards });
});

// PUT /api/cards/:id/review — 复习评分
router.put('/:id/review', (req, res) => {
  const cards = readCards();
  const idx = cards.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '卡片不存在' });

  const { quality } = req.body;
  if (quality === undefined || quality < 0 || quality > 5) {
    return res.status(400).json({ error: '评分必须是 0~5' });
  }

  const card = cards[idx];
  const result = sm2(quality, card.repetitions, card.interval, card.ease);
  card.repetitions = result.repetitions;
  card.interval = result.interval;
  card.ease = result.ease;
  card.nextReview = result.nextReview;

  writeCards(cards);
  res.json(card);
});

// DELETE /api/cards/:id — 删除卡片
router.delete('/:id', (req, res) => {
  const cards = readCards();
  const filtered = cards.filter(c => c.id !== req.params.id);
  if (filtered.length === cards.length) {
    return res.status(404).json({ error: '卡片不存在' });
  }
  writeCards(filtered);
  res.json({ deleted: true });
});

module.exports = router;
