// 所有橫向場景共用的尺寸與小工具
// 畫面高 11 格（264px）：0-6 格是背景（每一區不同），7-10 格是路面（5 排可以走）
import { TILE, px, hash } from './sceneArt.js'

export const ROWS = 11
export const LANES = 5
export const GROUND_TOP = 7 * TILE
// 第幾排（0 最裡面、4 最靠鏡頭）的人物腳底 y
export const laneY = (lane) => GROUND_TOP + 16 + lane * 18

// ---------- 路面（4 格高）：顏色由每一區自己決定 ----------
//   base 底色、line 磚縫、edge 跟背景交界的陰影、curb 最前面的路緣
export function ground(ctx, tx, c) {
  const X = tx * TILE, top = GROUND_TOP
  px(ctx, X, top, TILE, 4 * TILE, c.base)
  px(ctx, X, top, TILE, 2, c.edge)
  if (c.line) {
    ;[14, 32, 50, 70].forEach((dy, i) => {
      const y = top + dy
      px(ctx, X, y, TILE, 1, c.line)
      const off = (tx * 7 + i * 11) % TILE
      px(ctx, X + off, y - 14, 1, 14, c.line)
    })
  }
  if (c.dots) { // 碎石、落葉之類的點點
    for (let i = 0; i < 14; i++) {
      const dx = Math.floor(hash(tx * 31 + i, 5) * TILE)
      const dy = 4 + Math.floor(hash(tx * 17 + i, 9) * (4 * TILE - 12))
      px(ctx, X + dx, top + dy, c.dotSize || 1, 1, c.dots[i % c.dots.length])
    }
  }
  px(ctx, X, ROWS * TILE - 6, TILE, 6, c.curb)
  px(ctx, X, ROWS * TILE - 6, TILE, 1, c.curbHi)
}

// 建一張暫存畫布，畫一次之後重複使用
export function offscreen(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'))
  return c
}

// ---------- 星空 ----------
export function stars(ctx, camX, viewW, h, color) {
  for (let i = 0; i < 30; i++) {
    const sx = Math.floor(hash(i, 7) * 400 - camX * 0.1) % viewW
    px(ctx, (sx + viewW) % viewW, Math.floor(hash(i, 3) * h), 1, 1, color)
  }
}

// 一層一層的漸層天空（像素風，不用平滑漸層）
export function bandedSky(ctx, viewW, bands) {
  let y = 0
  bands.forEach(([h, color]) => { px(ctx, 0, y, viewW, h, color); y += h })
}
