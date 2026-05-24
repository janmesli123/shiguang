/**
 * AI 拆卡 API
 * 调用 DeepSeek API，把一段文字自动拆成多张问答卡片
 */
const express = require('express');
const router = express.Router();

// API Key 从环境变量读取，不写死在代码里（防泄露）
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

/**
 * POST /api/ai/generate
 * Body: { text: "要学习的内容", count: 3 }
 * 返回: { cards: [{ front, back, tags }] }
 */
router.post('/generate', async (req, res) => {
  const { text, count = 5 } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: '请输入要学习的内容' });
  }

  const prompt = `你是一个学习卡片生成器。请把下面的内容拆解成 ${count} 张闪卡（flashcard）。

要求：
1. 每张卡片有 front（问题）和 back（简洁答案）
2. 问题要具体，不要太宽泛
3. 答案控制在 2~3 句话内
4. 提取关键标签放在 tags 数组里
5. 只返回 JSON 数组，不要多余文字

输入内容：
${text}

返回格式（严格 JSON）：
[
  { "front": "问题", "back": "答案", "tags": ["标签1"] }
]`;

  try {
    const response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是学习助手，专门把知识拆解成简洁的问答闪卡。只返回 JSON，不要多余解释。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('DeepSeek API 错误:', err);
      return res.status(502).json({ error: 'AI 服务暂时不可用，请稍后重试' });
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    // 从回复中提取 JSON（AI 有时会加 ```json 包裹）
    let cards;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      cards = JSON.parse(jsonStr);
    } catch {
      console.error('AI 返回内容解析失败:', content);
      return res.status(502).json({ error: 'AI 返回格式异常，请重试' });
    }

    if (!Array.isArray(cards)) {
      cards = [cards];
    }

    res.json({ cards });
  } catch (err) {
    console.error('AI 请求失败:', err.message);
    res.status(500).json({ error: '网络错误，请检查网络连接' });
  }
});

module.exports = router;
