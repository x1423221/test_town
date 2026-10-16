// 場景用的像素圖：地圖格子、路人、物件、放大鏡
// 視角：斜前方看過去（像經典 RPG），街道左右延伸，建築物都看得到正面
import { drawGirl, drawBoy } from './characters.js'

export const TILE = 24

const COL = {
  walk: '#8a8496', walkLine: '#7a7486',
  sky: '#141a33', skyStar: '#4a5490',
  concrete: '#8a8e9c', concreteDark: '#6b6f80', concreteLight: '#a8acb8', concreteLine: '#5a5e6e',
  wall: '#5b5f7e', roof: '#3a3e58', window: '#ffd166', windowOff: '#2e3248',
  outline: '#2b2233',
}



// 依座標產生固定的亂數，讓同一格每次畫都一樣
function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995
  h = (h ^ (h >>> 13)) * 1274126177
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

function px(ctx, x, y, w, h, c) {
  ctx.fillStyle = c
  ctx.fillRect(x, y, w, h)
}

// ---------- 電車（側面）：銀色車身、窗戶、條紋 ----------
const CAR = 64
export const TRAIN_LENGTH = (cars) => cars * (CAR + 2)

export function drawTrain(ctx, x, y, cars, headingRight) {
  for (let i = 0; i < cars; i++) {
    const cx = x + i * (CAR + 2)
    px(ctx, cx, y + 2, CAR, 17, '#c8ccd4')     // 車身
    px(ctx, cx, y + 2, CAR, 2, '#a8adb8')      // 車頂
    px(ctx, cx, y + 13, CAR, 3, '#8cc63f')     // 黃綠色條紋
    for (let wx = 4; wx < CAR - 6; wx += 9) px(ctx, cx + wx, y + 6, 6, 5, '#2a3048') // 窗戶
    ;[18, 44].forEach((dx) => { px(ctx, cx + dx, y + 5, 7, 13, '#b0b4be'); px(ctx, cx + dx + 1, y + 6, 2, 4, '#2a3048'); px(ctx, cx + dx + 4, y + 6, 2, 4, '#2a3048'); px(ctx, cx + dx, y + 13, 7, 3, '#8cc63f') }) // 車門
    if (i % 2 === 0) { px(ctx, cx + 24, y - 3, 12, 1, '#3a3a48'); px(ctx, cx + 29, y - 2, 2, 4, '#3a3a48') } // 集電弓
    px(ctx, cx, y + 18, CAR, 1, '#3a3a48')
    ;[8, CAR - 14].forEach((dx) => { px(ctx, cx + dx, y + 19, 6, 2, '#2b2233') }) // 車輪
  }
  // 車頭
  const headX = headingRight ? x + cars * (CAR + 2) - 2 : x - 6
  px(ctx, headX, y + 4, 8, 15, '#c8ccd4')
  px(ctx, headX + (headingRight ? 1 : 2), y + 5, 5, 6, '#2a3048')
  px(ctx, headX, y + 13, 8, 3, '#8cc63f')
}

// ---------- 小圖快取：把像素陣列轉成 canvas，畫的時候直接貼 ----------
const cache = new Map()

function bufferToCanvas({ w, h, pixels }) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  pixels.forEach((col, i) => {
    if (!col) return
    ctx.fillStyle = col
    ctx.fillRect(i % w, Math.floor(i / w), 1, 1)
  })
  return c
}

function cached(key, make) {
  if (!cache.has(key)) cache.set(key, bufferToCanvas(make()))
  return cache.get(key)
}

function sheet(w, h) {
  const buf = { w, h, pixels: new Array(w * h).fill(null) }
  const r = (x, y, ww, hh, c) => {
    for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) {
      const X = x + i, Y = y + j
      if (X >= 0 && X < w && Y >= 0 && Y < h) buf.pixels[Y * w + X] = c
    }
  }
  return { buf, r }
}

function outline(buf) {
  const out = buf.pixels.slice()
  for (let y = 0; y < buf.h; y++) for (let x = 0; x < buf.w; x++) {
    if (buf.pixels[y * buf.w + x]) continue
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const X = x + dx, Y = y + dy
      return X >= 0 && X < buf.w && Y >= 0 && Y < buf.h && buf.pixels[Y * buf.w + X]
    })
    if (near) out[y * buf.w + x] = COL.outline
  }
  buf.pixels = out
  return buf
}

// 路人：跟主角同樣比例，可換髮色、外套、圍裙、頭巾、帽子
function makeNpc(colors, frame) {
  const { buf, r } = sheet(24, 37)
  const oy = 2 + frame
  const R = (x, y, w, h, c) => r(x, y + oy, w, h, c)
  R(8, 28, 3, 2, '#3c4258'); R(13, 28, 3, 2, '#3c4258')
  R(7, 30, 4, 1, '#4a3c32'); R(13, 30, 4, 1, '#4a3c32')
  R(4, 19, 2, 7, colors.coat); R(18, 19, 2, 7, colors.coat)
  R(4, 26, 2, 1, '#f7d3b8'); R(18, 26, 2, 1, '#f7d3b8')
  R(6, 18, 12, 12, colors.coat)
  if (colors.apron) { R(8, 20, 8, 10, colors.apron); R(9, 18, 1, 2, colors.apron); R(14, 18, 1, 2, colors.apron) }
  if (colors.skirt) { R(6, 23, 12, 8, colors.skirt); } // 袴
  if (colors.guitar) { R(5, 22, 9, 7, '#b0703a'); R(7, 24, 3, 3, '#3a2418'); R(13, 20, 8, 2, '#5a3a20'); R(20, 19, 2, 4, '#3a2418') } // 吉他
  R(6, 7, 12, 10, '#f7d3b8')
  R(5, 2, 14, 6, colors.hair); R(4, 4, 2, 8, colors.hair); R(18, 4, 2, 8, colors.hair)
  if (colors.cap) { R(4, 1, 16, 3, colors.cap); R(3, 4, 18, 1, '#1b1e30') }
  if (colors.band) { R(4, 5, 16, 2, colors.band); R(19, 6, 2, 3, colors.band) }
  ;[8, 14].forEach((x) => R(x, 12, 2, 2, '#2a2230'))
  R(7, 14, 2, 1, '#f2a2a0'); R(15, 14, 2, 1, '#f2a2a0')
  R(11, 15, 2, 1, '#b8564e')
  return outline(buf)
}

function makeSign() {
  const { buf, r } = sheet(24, 37)
  r(11, 20, 2, 16, '#5a4030')
  r(3, 10, 18, 11, '#c9a46a')
  r(4, 11, 16, 9, '#e8d4a8')
  r(13, 12, 2, 6, '#5a4030'); r(8, 14, 6, 2, '#5a4030'); r(14, 13, 1, 4, '#5a4030') // →
  return outline(buf)
}

// 路人側面（面向右，往左走時由畫面那邊翻轉）
function makeNpcSide(colors, frame) {
  const { buf, r } = sheet(24, 37)
  const R = (x, y, w, h, c) => r(x, y + 2, w, h, c)
  const skin = '#f7d3b8'
  if (frame === 0) { // 跨步
    R(13, 28, 3, 2, '#3c4258'); R(13, 30, 4, 1, '#4a3c32')
    R(8, 28, 3, 2, '#3c4258'); R(7, 30, 4, 1, '#4a3c32')
  } else {
    R(10, 28, 4, 2, '#3c4258'); R(10, 30, 5, 1, '#4a3c32')
  }
  R(8, 18, 9, 12, colors.coat)
  if (colors.apron) R(14, 20, 3, 10, colors.apron)
  if (colors.skirt) R(7, 23, 11, 8, colors.skirt)
  if (frame === 0) { R(13, 19, 3, 6, colors.coat); R(15, 25, 2, 1, skin) }
  else { R(9, 19, 3, 6, colors.coat); R(8, 25, 2, 1, skin) }
  R(8, 7, 10, 10, skin)
  R(18, 11, 1, 2, skin)
  R(6, 2, 12, 5, colors.hair); R(6, 7, 5, 6, colors.hair); R(15, 7, 3, 1, colors.hair)
  if (colors.cap) { R(6, 1, 13, 3, colors.cap); R(15, 4, 5, 1, '#1b1e30') }
  R(14, 11, 2, 2, '#2a2230')
  R(14, 14, 2, 1, '#f2a2a0')
  R(16, 15, 1, 1, '#b8564e')
  return outline(buf)
}

// 路人背影（面向攤位挑東西）；bag 有顏色的話右手提一個購物袋
function makeNpcBack(colors) {
  const { buf, r } = sheet(24, 37)
  const R = (x, y, w, h, c) => r(x, y + 2, w, h, c)
  R(8, 28, 3, 2, '#3c4258'); R(13, 28, 3, 2, '#3c4258')
  R(7, 30, 4, 1, '#4a3c32'); R(13, 30, 4, 1, '#4a3c32')
  R(4, 19, 2, 7, colors.coat); R(18, 19, 2, 7, colors.coat)
  R(4, 26, 2, 1, '#f7d3b8'); R(18, 26, 2, 1, '#f7d3b8')
  R(6, 18, 12, 12, colors.coat)
  if (colors.skirt) R(6, 23, 12, 8, colors.skirt)
  R(6, 7, 12, 10, colors.hair)              // 後腦勺
  R(5, 2, 14, 6, colors.hair); R(4, 4, 2, 8, colors.hair); R(18, 4, 2, 8, colors.hair)
  R(5, 9, 1, 3, '#f7d3b8'); R(18, 9, 1, 3, '#f7d3b8') // 耳朵
  R(8, 16, 8, 2, '#f7d3b8')                            // 後頸
  if (colors.cap) { R(4, 1, 16, 3, colors.cap) }
  if (colors.bag) { R(19, 26, 1, 2, '#c8c8d0'); R(18, 28, 5, 6, colors.bag); R(18, 28, 5, 1, '#ffffff') }
  return outline(buf)
}

// 路邊的大銀杏：樹幹夠粗，可以躲一個人（探頭彩蛋用）
function makeBigTree() {
  const { buf, r } = sheet(44, 80)
  // 樹幹＋樹根
  r(16, 34, 12, 44, '#6a4a34'); r(16, 34, 2, 44, '#7e5a40'); r(25, 34, 3, 44, '#54382a')
  for (let y = 40; y < 76; y += 7) r(19 + (y % 3), y, 3, 1, '#54382a')
  r(12, 75, 20, 3, '#6a4a34'); r(10, 77, 24, 2, '#54382a'); r(14, 74, 3, 2, '#6a4a34'); r(27, 74, 3, 2, '#6a4a34')
  // 樹冠（黃色銀杏，幾團疊在一起）
  const blobs = [[4, 14, 18, 16], [22, 12, 18, 18], [10, 2, 24, 16], [2, 24, 16, 12], [26, 24, 16, 12], [12, 22, 20, 16]]
  blobs.forEach(([x, y, w, h]) => { r(x + 2, y, w - 4, h, '#e8a820'); r(x, y + 2, w, h - 4, '#e8a820') })
  blobs.forEach(([x, y, w, h]) => { r(x + 3, y + 1, w - 6, h - 5, '#f2c230') })
  ;[[8, 6], [20, 4], [30, 16], [6, 20], [16, 14], [34, 28], [24, 26], [10, 30], [28, 8]].forEach(([x, y]) => r(x, y, 3, 2, '#fbe07a'))
  r(6, 34, 32, 2, '#c8901a'); r(14, 36, 16, 1, '#c8901a')
  return outline(buf)
}

// 長椅
function makeBench() {
  const { buf, r } = sheet(36, 37)
  r(3, 18, 30, 3, '#8a5a3a'); r(3, 22, 30, 3, '#8a5a3a') // 椅背
  r(2, 27, 32, 3, '#a06a40'); r(2, 27, 32, 1, '#c08a50') // 座位
  r(4, 18, 2, 18, '#2a2a38'); r(30, 18, 2, 18, '#2a2a38') // 鐵腳
  r(3, 33, 4, 3, '#2a2a38'); r(29, 33, 4, 3, '#2a2a38')
  return outline(buf)
}

// pose：'front'（正面站著，不晃動）、'side'（側面走路，frame 0/1 交替）、'back'（背對鏡頭）
export function objectCanvas(obj, frame, pose = 'front') {
  // 用外觀（顏色組合）當快取的名字：不同區域可以有同 id 的人，不會互相蓋掉
  const look = obj.sprite === 'npc' ? JSON.stringify(obj.colors) : ''
  if (obj.sprite === 'npc' && pose === 'back') return cached(`npcb-${look}`, () => makeNpcBack(obj.colors))
  if (obj.sprite === 'npc' && pose === 'side') return cached(`npcs-${look}-${frame}`, () => makeNpcSide(obj.colors, frame))
  if (obj.sprite === 'npc') return cached(`npc-${look}`, () => makeNpc(obj.colors, 0))
  const MAKERS = { sign: makeSign, bench: makeBench, bigtree: makeBigTree }
  if (MAKERS[obj.sprite]) return cached(obj.sprite, MAKERS[obj.sprite])
  return null
}

// 主角：上 → 背面、左右 → 側面（往左時由畫面那邊翻轉）、下 → 正面
export function girlCanvas(facing, walking, frame) {
  const base = facing === 'up' ? 'back' : facing === 'left' || facing === 'right' ? 'side' : ''
  const pose = base ? `${base}-${walking ? 'walk' : 'idle'}` : (walking ? 'walk' : 'idle')
  return cached(`girl-${pose}-${frame}`, () => drawGirl(pose, frame))
}

// 男生：'idle'（正面）/ 'side-walk' / 'side-idle'
export function boyCanvas(pose, frame = 0) {
  return cached(`boy-${pose}-${frame}`, () => drawBoy(pose, frame))
}

// ---------- 道具圖 ----------
// 小鎮的星星；彩蛋拿到的是粉紅色那顆
function makeStar(main = '#ffd166', hi = '#fff2c8') {
  const { buf, r } = sheet(17, 17)
  const rows = [[8, 1], [8, 1], [7, 3], [7, 3], [0, 17], [1, 15], [3, 11], [4, 9], [4, 9], [3, 11], [3, 4, 10, 4], [2, 3, 12, 3], [2, 2, 13, 2]]
  rows.forEach((row, y) => {
    for (let k = 0; k < row.length; k += 2) r(row[k], y + 2, row[k + 1], 1, main)
  })
  r(7, 7, 1, 2, '#2b2233'); r(10, 7, 1, 2, '#2b2233'); r(6, 9, 1, 1, '#ff9aa8'); r(11, 9, 1, 1, '#ff9aa8'); r(8, 10, 2, 1, '#c8564e')
  r(8, 3, 1, 2, hi); r(5, 6, 2, 1, hi)
  return outline(buf)
}

const ITEMS = { star: () => makeStar(), 'star-pink': () => makeStar('#ff9ab8', '#ffe0ea') }

export function itemCanvas(id) {
  return ITEMS[id] ? cached(`item-${id}`, ITEMS[id]) : null
}

// 放大鏡
export function magnifierCanvas() {
  return cached('magnifier', () => {
    const { buf, r } = sheet(13, 13)
    r(3, 0, 5, 1, '#f3efe8'); r(1, 1, 2, 1, '#f3efe8'); r(8, 1, 2, 1, '#f3efe8')
    r(0, 3, 1, 5, '#f3efe8'); r(10, 3, 1, 5, '#f3efe8')
    r(1, 2, 1, 1, '#f3efe8'); r(9, 2, 1, 1, '#f3efe8'); r(1, 8, 1, 1, '#f3efe8'); r(9, 8, 1, 1, '#f3efe8')
    r(1, 9, 2, 1, '#f3efe8'); r(8, 9, 2, 1, '#f3efe8'); r(3, 10, 5, 1, '#f3efe8')
    r(1, 3, 9, 5, '#9fd8ff'); r(3, 1, 5, 9, '#9fd8ff'); r(2, 2, 7, 7, '#9fd8ff')
    r(3, 3, 2, 2, '#ffffff')
    r(9, 9, 2, 2, '#c9a46a'); r(10, 10, 2, 2, '#c9a46a'); r(11, 11, 2, 2, '#8a6a3a')
    return outline(buf)
  })
}

// 給橫向捲軸場景共用
export { px, hash }
