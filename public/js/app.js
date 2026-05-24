/**
 * 拾光 — 前端主逻辑
 * 处理视图切换、API 调用、复习流程
 */

// ============ 状态 ============
let dueCards = [];       // 今日待复习卡片
let currentIndex = 0;    // 当前复习到第几张
let isFlipped = false;   // 当前卡片是否已翻转

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', () => {
  // 显示日期
  const now = new Date();
  document.getElementById('today-date').textContent =
    `${now.getMonth() + 1}月${now.getDate()}日`;

  // 加载首页统计
  loadStats();
});

// ============ 视图切换 ============
function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');

  // 更新底部导航高亮
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navBtn = document.querySelector(`[data-view="${name}"]`);
  if (navBtn) navBtn.classList.add('active');

  if (name === 'home') loadStats();
}

// ============ 首页统计 ============
async function loadStats() {
  try {
    const res = await fetch('/api/cards/stats');
    const stats = await res.json();
    document.getElementById('stat-due').textContent = stats.due;
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-learned').textContent = stats.learned;
    document.getElementById('stat-new').textContent = stats.newCards;
  } catch (err) {
    console.error('加载统计失败:', err);
  }
}

// ============ 复习流程 ============
async function startReview() {
  switchView('review');

  // 重置 UI 状态（上次复习完可能隐藏了元素）
  document.getElementById('flashcard').style.display = '';
  document.getElementById('review-btns').style.display = 'none';
  document.getElementById('review-progress').style.display = '';
  document.getElementById('review-done').style.display = 'none';

  try {
    const res = await fetch('/api/cards/due');
    dueCards = await res.json();
    currentIndex = 0;

    if (dueCards.length === 0) {
      showReviewDone();
      return;
    }

    showCard();
  } catch (err) {
    toast('加载失败，请重试');
  }
}

function showCard() {
  if (currentIndex >= dueCards.length) {
    showReviewDone();
    return;
  }

  const card = dueCards[currentIndex];
  document.getElementById('review-progress').textContent =
    `第 ${currentIndex + 1}/${dueCards.length} 张`;

  document.getElementById('card-front').textContent = card.front;
  document.getElementById('card-back').textContent = card.back;

  // 重置翻转状态
  isFlipped = false;
  document.getElementById('flashcard').classList.remove('flipped');
  document.getElementById('review-btns').style.display = 'none';
  document.getElementById('card-hint').textContent = '点击翻转查看答案';
}

function flipCard() {
  if (isFlipped) return;
  isFlipped = true;

  document.getElementById('flashcard').classList.add('flipped');
  document.getElementById('review-btns').style.display = 'grid';
  document.getElementById('card-hint').textContent = '选择你的掌握程度';
}

async function rateCard(quality) {
  const card = dueCards[currentIndex];
  try {
    await fetch(`/api/cards/${card.id}/review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quality })
    });
  } catch (err) {
    console.error('评分提交失败:', err);
  }

  currentIndex++;
  showCard();
}

function showReviewDone() {
  document.getElementById('flashcard').style.display = 'none';
  document.getElementById('review-btns').style.display = 'none';
  document.getElementById('review-progress').style.display = 'none';
  document.getElementById('review-done').style.display = 'block';
}

// ============ AI 拆卡 ============
async function aiGenerate() {
  const text = document.getElementById('ai-input').value.trim();
  const count = parseInt(document.getElementById('ai-count').value) || 5;

  if (!text) {
    toast('请输入要学习的内容');
    return;
  }

  document.getElementById('ai-loading').style.display = 'block';
  document.getElementById('ai-preview').innerHTML = '';

  try {
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, count })
    });

    const data = await res.json();
    if (!res.ok) {
      toast(data.error || 'AI 生成失败');
      return;
    }

    // 预览 AI 生成的卡片
    const preview = document.getElementById('ai-preview');
    preview.innerHTML = `<h3 style="margin-bottom: 12px;">AI 生成了 ${data.cards.length} 张卡片：</h3>`;

    data.cards.forEach((card, i) => {
      preview.innerHTML += `
        <div class="preview-card">
          <div class="q">Q: ${escapeHtml(card.front)}</div>
          <div class="a">A: ${escapeHtml(card.back)}</div>
          <div class="tags">${(card.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
        </div>`;
    });

    // 添加确认按钮
    preview.innerHTML += `
      <button class="action-btn btn-primary" onclick="saveAiCards()" style="margin-top: 12px;">
        ✅ 全部保存
      </button>
      <button class="action-btn btn-secondary" onclick="document.getElementById('ai-preview').innerHTML=''">
        ❌ 取消
      </button>`;

    // 暂存生成的卡片
    window._aiGeneratedCards = data.cards;

  } catch (err) {
    toast('网络错误: ' + err.message);
  } finally {
    document.getElementById('ai-loading').style.display = 'none';
  }
}

async function saveAiCards() {
  if (!window._aiGeneratedCards) return;

  try {
    const cards = window._aiGeneratedCards.map(c => ({
      front: c.front,
      back: c.back,
      tags: c.tags || [],
      source: 'ai'
    }));

    const res = await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cards)
    });

    if (res.ok) {
      const data = await res.json();
      toast(`✅ 已保存 ${data.added} 张卡片！`);
      document.getElementById('ai-preview').innerHTML = '';
      document.getElementById('ai-input').value = '';
      window._aiGeneratedCards = null;
    }
  } catch (err) {
    toast('保存失败: ' + err.message);
  }
}

// ============ 手动添加 ============
async function manualAdd() {
  const front = document.getElementById('manual-front').value.trim();
  const back = document.getElementById('manual-back').value.trim();
  const tagsStr = document.getElementById('manual-tags').value.trim();

  if (!front || !back) {
    toast('请填写问题和答案');
    return;
  }

  const tags = tagsStr ? tagsStr.split(/[,，]/).map(t => t.trim()).filter(Boolean) : [];

  try {
    const res = await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ front, back, tags, source: 'manual' })
    });

    if (res.ok) {
      toast('✅ 卡片已添加！');
      document.getElementById('manual-front').value = '';
      document.getElementById('manual-back').value = '';
      document.getElementById('manual-tags').value = '';
    }
  } catch (err) {
    toast('添加失败: ' + err.message);
  }
}

// ============ 工具函数 ============
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
