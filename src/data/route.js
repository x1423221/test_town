// 遊戲路線
// 目前只有「像素小鎮」一區
import town from './town.js'

export const GAME_TITLE = '像素小鎮'
export const STORAGE_KEY = 'pixel-town-demo-v1'
export const QUIZ_LABEL = '小問題' // 答題框上的標籤

export const ROUTE = [
  { id: 'town', title: '像素小鎮', unlockAt: '2000-01-01T00:00:00+09:00', scene: town },
  {
    id: 'end', title: '謝謝遊玩！', label: '', unlockAt: '2000-01-01T00:00:00+09:00', scene: null,
    // 玩完小鎮之後看到的畫面
    message: ['小鎮逛完了，辛苦了～'],
  },
]
