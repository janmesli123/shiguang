/**
 * SM-2 间隔复习算法
 * 和 Anki 同款，根据你的评分决定下次什么时候复习
 *
 * 评分说明（quality）：
 *   0 = 完全忘了
 *   1 = 想不起来，看答案后觉得熟悉
 *   2 = 想不起来，但看答案后记住了
 *   3 = 费力想起来了
 *   4 = 稍微想了一下就记住了
 *   5 = 秒杀，完全记住
 *
 * 简化版用 4 个按钮对应：
 *   忘了 → 0, 模糊 → 2, 记住 → 4, 秒杀 → 5
 */

/**
 * 计算下次复习时间
 * @param {number} quality - 评分 0~5
 * @param {number} repetitions - 已连续正确次数
 * @param {number} interval - 当前间隔天数
 * @param {number} ease - 难度系数（默认 2.5）
 * @returns {{ repetitions, interval, ease, nextReview }}
 */
function sm2(quality, repetitions, interval, ease) {
  // 评分 < 3 视为没记住，重置
  if (quality < 3) {
    return {
      repetitions: 0,
      interval: 1,
      ease: Math.max(1.3, ease - 0.2),
      nextReview: _addDays(new Date(), 1)
    };
  }

  // 记住了，计算新间隔
  let newRepetitions = repetitions + 1;
  let newInterval;

  if (newRepetitions === 1) {
    newInterval = 1;        // 第一次记住 → 明天再来
  } else if (newRepetitions === 2) {
    newInterval = 6;        // 第二次记住 → 6天后
  } else {
    newInterval = Math.round(interval * ease);
  }

  // 更新难度系数
  let newEase = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEase = Math.max(1.3, newEase); // 最低 1.3

  return {
    repetitions: newRepetitions,
    interval: newInterval,
    ease: parseFloat(newEase.toFixed(2)),
    nextReview: _addDays(new Date(), newInterval)
  };
}

/**
 * 工具函数：日期加天数
 */
function _addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// 浏览器和 Node.js 都能用
if (typeof module !== 'undefined') {
  module.exports = { sm2 };
}
