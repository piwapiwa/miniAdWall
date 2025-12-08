// client/src/utils/adUtils.ts
import { Ad } from '../types';

/**
 * 核心竞价排名算法
 * 规则：权重 = 出价 + (出价 * 点击数 * 0.42)
 */
// ✅ 修改为接收一个 Ad 对象
export const calculateBidScore = (ad: Ad): number => {
  const price = Number(ad.price) || 0;
  const clicks = ad.clicks || 0;
  return price + (price * clicks * 0.42);
};

export const sortAdsByScore = (ads: Ad[]) => {
  return [...ads].sort((a, b) => {
    // 调用变简单了
    return calculateBidScore(b) - calculateBidScore(a);
  });
};